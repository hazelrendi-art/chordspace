import { getAllSongs, saveAllSongs, validateSong } from '../../../lib/store'
import { isAdmin, checkRateLimit, validateCsrfToken, getSessionToken } from '../../../lib/auth'

export default async function handler(req, res) {
  const { id } = req.query

  if (req.method === 'GET') {
    const songs = await getAllSongs()
    const idx = songs.findIndex(s => s.id === id)
    if (idx === -1) return res.status(404).json({ error: 'Lagu tidak ditemukan.' })
    return res.status(200).json(songs[idx])
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
  const songs = await getAllSongs()
  const idx = songs.findIndex(s => s.id === id)

  if (req.method === 'PUT') {
    if (idx === -1) return res.status(404).json({ error: 'Lagu tidak ditemukan.' })
    const { title, artist, content, difficulty, description, csrf_token } = req.body || {}
    if (sessionToken && !(await validateCsrfToken(sessionToken, csrf_token))) {
      return res.status(403).json({ error: 'CSRF token tidak valid atau expired.' })
    }
    const errors = validateSong({ title, artist, content, difficulty, description })
    if (errors.length) return res.status(400).json({ error: errors.join('; ') })
    if (title) songs[idx].title = String(title).trim()
    if (artist !== undefined) songs[idx].artist = String(artist).trim()
    if (content) songs[idx].content = String(content).trim()
    if (difficulty) songs[idx].difficulty = difficulty
    if (description !== undefined) songs[idx].description = String(description).trim()
    await saveAllSongs(songs)
    return res.status(200).json({ song: songs[idx] })
  }

  if (req.method === 'DELETE') {
    if (idx === -1) return res.status(404).json({ error: 'Lagu tidak ditemukan.' })
    const { csrf_token } = req.body || {}
    if (sessionToken && !(await validateCsrfToken(sessionToken, csrf_token))) {
      return res.status(403).json({ error: 'CSRF token tidak valid atau expired.' })
    }
    const [removed] = songs.splice(idx, 1)
    await saveAllSongs(songs)
    return res.status(200).json({ deleted: removed.id })
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
