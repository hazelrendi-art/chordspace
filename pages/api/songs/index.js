import { getAllSongs, saveAllSongs, slugify, validateSong } from '../../../lib/store'
import { isAdmin, checkRateLimit, validateCsrfToken, getSessionToken } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json(await getAllSongs())
  }

  if (!(await isAdmin(req))) {
    return res.status(401).json({ error: 'Unauthorized. Login dulu sebagai admin.' })
  }

  const limit = checkRateLimit(req)
  if (!limit.allowed) {
    res.setHeader('Retry-After', limit.retryAfter)
    return res.status(429).json({ error: `Terlalu banyak usaha. Coba lagi dalam ${limit.retryAfter}s.` })
  }

  if (req.method === 'POST') {
    const { title, artist, content, difficulty, description, csrf_token } = req.body || {}
    const sessionToken = getSessionToken(req)
    if (sessionToken && !(await validateCsrfToken(sessionToken, csrf_token))) {
      return res.status(403).json({ error: 'CSRF token tidak valid atau expired.' })
    }
    const errors = validateSong({ title, artist, content, difficulty, description })
    if (errors.length) return res.status(400).json({ error: errors.join('; ') })
    const songs = await getAllSongs()
    let id = slugify(title)
    while (songs.some(s => s.id === id)) id = `${id}-${Date.now() % 10000}`
    const song = {
      id, title: String(title).trim(), artist: String(artist || '').trim(),
      difficulty: difficulty || 'Beginner', description: String(description || '').trim(),
      content: String(content).trim()
    }
    songs.push(song)
    await saveAllSongs(songs)
    return res.status(201).json({ song })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end(`Method ${req.method} Not Allowed`)
}
