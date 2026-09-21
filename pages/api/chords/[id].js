/* === SAAS + AUTH + SECURITY LAYER === */
import { waff, rateLimit } from '../../../lib/security';
import { isAdmin, checkRateLimit, validateCsrfToken, getSessionToken } from '../../../lib/auth';
import { getAllChords, saveAllChords, getChordById, validateChord, slugify } from '../../../lib/store';

export default async function handler(req, res) {
  await waff(req, res, () => {});
  await rateLimit(req, res, () => {});

  if (req.method === 'GET') {
    const chord = await getChordById(req.query.id);
    if (!chord) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(chord);
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
    const { name, fingering, difficulty, description, csrf_token } = req.body || {};
    const sessionToken = getSessionToken(req);
    if (sessionToken && !(await validateCsrfToken(sessionToken, csrf_token))) {
      return res.status(403).json({ error: 'CSRF token tidak valid atau expired.' });
    }
    const chords = await getAllChords();
    const idx = chords.findIndex(c => c.id === id);
    if (idx < 0) return res.status(404).json({ error: 'Not found' });
    const errors = validateChord({ name, fingering, difficulty, description });
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    chords[idx] = { ...chords[idx], name: String(name).trim(), fingering: String(fingering).trim(), difficulty: difficulty || 'Beginner', description: String(description || '').trim() };
    await saveAllChords(chords);
    return res.status(200).json({ chord: chords[idx] });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const { csrf_token } = req.body || {};
    const sessionToken = getSessionToken(req);
    if (sessionToken && !(await validateCsrfToken(sessionToken, csrf_token))) {
      return res.status(403).json({ error: 'CSRF token tidak valid atau expired.' });
    }
    const chords = await getAllChords();
    const filtered = chords.filter(c => c.id !== id);
    if (filtered.length === chords.length) return res.status(404).json({ error: 'Not found' });
    await saveAllChords(filtered);
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}