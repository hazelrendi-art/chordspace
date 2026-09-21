/* === SAAS + AUTH + SECURITY LAYER === */
import { waff, rateLimit } from '../../../lib/security';
import { isAdmin, checkRateLimit, validateCsrfToken, getSessionToken } from '../../../lib/auth';
import { getAllSongs, saveAllSongs, getSongById, validateSong } from '../../../lib/store';

export default async function handler(req, res) {
  await waff(req, res, () => {});
  await rateLimit(req, res, () => {});

  if (req.method === 'GET') {
    const song = await getSongById(req.query.id);
    if (!song) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(song);
  }

  if (!(await isAdmin(req))) {
    return res.status(401).json({ error: 'Unauthorized. Login dulu sebagai admin.' });
  }

  const limit = checkRateLimit(req);
  if (!limit.allowed) {
    res.setHeader('Retry-After', limit.retryAfter);
    return res.status(429).json({ error: `Terlalu banyak usaha. Coba lagi dalam ${limit.retryAfter}s.` });
  }

  if (req.method === 'PUT') {
    const { id } = req.query;
    const { title, artist, content, difficulty, description, csrf_token } = req.body || {};
    const sessionToken = getSessionToken(req);
    if (sessionToken && !(await validateCsrfToken(sessionToken, csrf_token))) {
      return res.status(403).json({ error: 'CSRF token tidak valid atau expired.' });
    }
    const songs = await getAllSongs();
    const idx = songs.findIndex(s => s.id === id);
    if (idx < 0) return res.status(404).json({ error: 'Not found' });
    const errors = validateSong({ title, artist, content, difficulty, description });
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    songs[idx] = { ...songs[idx], title: String(title).trim(), artist: String(artist || '').trim(), difficulty: difficulty || 'Beginner', description: String(description || '').trim(), content: String(content).trim() };
    await saveAllSongs(songs);
    return res.status(200).json({ song: songs[idx] });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const { csrf_token } = req.body || {};
    const sessionToken = getSessionToken(req);
    if (sessionToken && !(await validateCsrfToken(sessionToken, csrf_token))) {
      return res.status(403).json({ error: 'CSRF token tidak valid atau expired.' });
    }
    const songs = await getAllSongs();
    const filtered = songs.filter(s => s.id !== id);
    if (filtered.length === songs.length) return res.status(404).json({ error: 'Not found' });
    await saveAllSongs(filtered);
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}