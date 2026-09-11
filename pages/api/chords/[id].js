// Upgrade: CSRF, validasi, rate limit
import { getAllChords, saveAllChords, validateChord } from '../../../lib/store'
import { isAdmin, checkRateLimit, validateCsrfToken, getSessionToken } from '../../../lib/auth'

export default async function handler(req, res) {
  const { id } = req.query

  if (req.method === 'GET') {
    const chords = await getAllChords()
    const idx = chords.findIndex(c => c.id === id)
    if (idx === -1) return res.status(404).json({ error: 'Chord tidak ditemukan.' })
    return res.status(200).json(chords[idx])
  }

  if (!(await isAdmin(req))) {
    return res.status(401).json({ error: 'Unauthorized. Login dulu sebagai admin.' })
  }

  const limit = checkRateLimit(req)
  if (!limit.allowed) {
    res.setHeader('Retry-After', limit.retryAfter)
    return res.status(429).json({ error: `Terlalu banyak usaha. Coba lagi dalam ${limit.retryAfter}s.` })
  }

  const sessionToken = getSessionToken(req)
  const chords = await getAllChords()
  const idx = chords.findIndex(c => c.id === id)

  if (req.method === 'PUT') {
    if (idx === -1) return res.status(404).json({ error: 'Chord tidak ditemukan.' })
    const { name, fingering, difficulty, description, csrf_token } = req.body || {}
    if (sessionToken && !(await validateCsrfToken(sessionToken, csrf_token))) {
      return res.status(403).json({ error: 'CSRF token tidak valid atau expired.' })
    }
    const errors = validateChord({ name, fingering, difficulty, description })
    if (errors.length) {
      return res.status(400).json({ error: errors.join('; ') })
    }
    if (name) chords[idx].name = String(name).trim()
    if (fingering) chords[idx].fingering = String(fingering).trim()
    if (difficulty) chords[idx].difficulty = difficulty
    if (description !== undefined) chords[idx].description = String(description).trim()
    await saveAllChords(chords)
    return res.status(200).json({ chord: chords[idx] })
  }

  if (req.method === 'DELETE') {
    if (idx === -1) return res.status(404).json({ error: 'Chord tidak ditemukan.' })
    const { csrf_token } = req.body || {}
    if (sessionToken && !(await validateCsrfToken(sessionToken, csrf_token))) {
      return res.status(403).json({ error: 'CSRF token tidak valid atau expired.' })
    }
    const [removed] = chords.splice(idx, 1)
    await saveAllChords(chords)
    return res.status(200).json({ deleted: removed.id })
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
