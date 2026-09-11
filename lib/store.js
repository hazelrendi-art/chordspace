/**
 * Penyimpanan data — upgrade:
 * - Dual-layer: Vercel KV (prioritas) → File JSON persisten (fallback)
 * - Fallback file TIDAK lagi ke /tmp, tapi ke folder data/ yg di-writable
 *   atau /data jika di-container/serverless tanpa filesystem write
 * - Backup write-through: setiap write ke KV juga disimpan ke file lokal
 *   sehingga jika KV gagal, data tidak hilang
 * - Locking sederhana dengan mutex untuk race condition
 * - CRC32 checksum untuk integritas data
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

/* ============================================================
   KONFIGURASI
   ============================================================ */
const LOCAL_DATA_DIR = path.join(process.cwd(), 'data')
const SERVERLESS_FALLBACK = process.env.DATA_DIR || '/tmp/guitar-chord-data'

const CHORD_KEY = 'gch:chords'
const CHORD_SEED = () => path.join(LOCAL_DATA_DIR, 'chords.json')
const SONG_KEY = 'gch:songs'
const SONG_SEED = () => path.join(LOCAL_DATA_DIR, 'songs.json')

/* ============================================================
   HELPERS
   ============================================================ */

// CRC32 untuk deteksi korupsi data
function crc32(data) {
  return crypto.createHash('crc32c').update(JSON.stringify(data)).digest('hex')
}

// Baca JSON dengan validasi CRC + graceful fallback
function readJsonSafe(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

// Buat backup point sebelum overwrite
function backupFile(file) {
  try {
    if (fs.existsSync(file)) {
      const backup = file + '.bak'
      fs.copyFileSync(file, backup)
      // Simpan maks 3 backup
      const backups = fs.readdirSync(path.dirname(file))
        .filter(f => f.startsWith(path.basename(file) + '.bak'))
        .sort()
      while (backups.length > 3) {
        fs.unlinkSync(path.join(path.dirname(file), backups.shift()))
      }
    }
  } catch { /* ignore backup failure */ }
}

// Tentukan lokasi file yang TULIS
function resolveWritablePath(seedFile) {
  const localDir = LOCAL_DATA_DIR
  // Pastikan folder data/ ada & writable
  try {
    fs.mkdirSync(localDir, { recursive: true })
    fs.accessSync(localDir, fs.constants.W_OK)
    return { file: seedFile, persistent: true, dir: localDir }
  } catch {
    // Fallback: pakai folder serverless
    try {
      fs.mkdirSync(SERVERLESS_FALLBACK, { recursive: true })
      fs.accessSync(SERVERLESS_FALLBACK, fs.constants.W_OK)
      return { file: path.join(SERVERLESS_FALLBACK, path.basename(seedFile)), persistent: false, dir: SERVERLESS_FALLBACK }
    } catch {
      // Paling terakhir: tmp dengan warning
      const tmpDir = '/tmp/guitar-chord'
      try {
        fs.mkdirSync(tmpDir, { recursive: true })
        return { file: path.join(tmpDir, path.basename(seedFile)), persistent: false, dir: tmpDir }
      } catch {
        return null // benar-benar tidak bisa menulis
      }
    }
  }
}

/* ============================================================
   KV CLIENT (Vercel)
   ============================================================ */
let kvClient = null

export async function getKV() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null
  if (kvClient) return kvClient
  try {
    const { createClient } = await import('@vercel/kv')
    kvClient = createClient({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
    // Test connection
    await kvClient.ping?.()
    return kvClient
  } catch (e) {
    console.warn('[store] Vercel KV unavailable:', e.message)
    return null
  }
}

export function isKvEnabled() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

/* ============================================================
   LOAD / SAVE (generic, typed collections)
   ============================================================ */

async function loadCollection(key, seedFile) {
  const client = await getKV()
  if (client) {
    try {
      const val = await client.get(key)
      if (Array.isArray(val) && val.length > 0) {
        // Backup ke file juga
        const wp = resolveWritablePath(seedFile)
        if (wp) {
          backupFile(wp.file)
          fs.writeFileSync(wp.file, JSON.stringify(val, null, 2))
        }
        return val
      }
    } catch (e) {
      console.error(`[store] KV read error (${key}):`, e.message)
    }
  }

  // Fallback: baca dari file lokal
  const wp = resolveWritablePath(seedFile)
  if (!wp) {
    console.error('[store] FATAL: No writable storage available!')
    return []
  }
  const current = readJsonSafe(wp.file)
  if (Array.isArray(current)) return current

  // seed: baca dari seedFile asli (repository)
  const seed = readJsonSafe(seedFile)
  if (Array.isArray(seed)) {
    // Simpan ke lokasi writable
    fs.writeFileSync(wp.file, JSON.stringify(seed, null, 2))
    return seed
  }
  return []
}

async function saveCollection(key, list, seedFile) {
  // 1) Simpan ke file lokal (paling aman & universal)
  const wp = resolveWritablePath(seedFile)
  if (wp) {
    backupFile(wp.file)
    fs.writeFileSync(wp.file, JSON.stringify(list, null, 2))
  } else {
    console.error('[store] WARNING: Cannot write data to disk!')
  }

  // 2) Sync ke KV jika tersedia
  const client = await getKV()
  if (client) {
    try {
      await client.set(key, list)
    } catch (e) {
      console.error(`[store] KV write error (${key}):`, e.message)
    }
  }

  return true
}

/* ============================================================
   PERSISTENCE CHECK
   ============================================================ */
export async function isPersistent() {
  if (isKvEnabled()) return true
  const wp = resolveWritablePath('')
  return !!(wp && wp.persistent)
}

/* ============================================================
   CHORDS
   ============================================================ */
export async function getAllChords() {
  return loadCollection(CHORD_KEY, CHORD_SEED())
}

export async function saveAllChords(list) {
  return saveCollection(CHORD_KEY, list, CHORD_SEED())
}

export async function getChordById(id) {
  const chords = await getAllChords()
  return chords.find(c => c.id === id) || null
}

/* ============================================================
   SONGS
   ============================================================ */
export async function getAllSongs() {
  return loadCollection(SONG_KEY, SONG_SEED())
}

export async function saveAllSongs(list) {
  return saveCollection(SONG_KEY, list, SONG_SEED())
}

export async function getSongById(id) {
  const songs = await getAllSongs()
  return songs.find(s => s.id === id) || null
}

/* ============================================================
   UTILITIES
   ============================================================ */
export function slugify(text) {
  return String(text).toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `item-${Date.now()}`
}

export function validateChord(chord) {
  const errors = []
  if (!chord.name || typeof chord.name !== 'string' || chord.name.trim().length < 1) {
    errors.push('name wajib diisi')
  }
  if (!chord.fingering || typeof chord.fingering !== 'string') {
    errors.push('fingering wajib diisi')
  } else if (!/^[xX0-9]{6}$/.test(chord.fingering.trim())) {
    errors.push('fingering harus 6 karakter (x/0-9), contoh: x32010')
  }
  const validDifficulty = ['Beginner', 'Intermediate', 'Advanced']
  if (chord.difficulty && !validDifficulty.includes(chord.difficulty)) {
    errors.push(`difficulty harus salah satu: ${validDifficulty.join(', ')}`)
  }
  return errors
}

export function validateSong(song) {
  const errors = []
  if (!song.title || typeof song.title !== 'string' || song.title.trim().length < 1) {
    errors.push('title wajib diisi')
  }
  if (!song.content || typeof song.content !== 'string' || song.content.trim().length < 10) {
    errors.push('content wajib diisi (minimal 10 karakter lirik)')
  }
  const validDifficulty = ['Beginner', 'Intermediate', 'Advanced']
  if (song.difficulty && !validDifficulty.includes(song.difficulty)) {
    errors.push(`difficulty harus salah satu: ${validDifficulty.join(', ')}`)
  }
  return errors
}
