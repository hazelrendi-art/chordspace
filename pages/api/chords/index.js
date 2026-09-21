/* === SAAS + AUTH + SECURITY LAYER === */
import { waff, rateLimit } from '../../../lib/security';
import { isAdmin, checkRateLimit, validateCsrfToken, getSessionToken } from '../../../lib/auth';
import { getAllChords, saveAllChords, slugify, validateChord } from '../../../lib/store';

export default async function handler(req, res) {
  await waff(req, res, () => {});
  await rateLimit(req, res, () => {});

  if (req.method === 'GET') {
    const chords = await getAllChords();
    return res.status(200).json(chords);
  }

  if (!(await isAdmin(req))) {
    return res.status(401).json({ error: 'Unauthorized. Login dulu sebagai admin.' });
  }

  const limit = checkRateLimit(req);
  if (!limit.allowed) {
    res.setHeader('Retry-After', limit.retryAfter);
    return res.status(429).json({ error: `Terlalu banyak usaha. Coba lagi dalam ${limit.retryAfter}s.` });
  }

  if (req.method === 'POST') {
    const { name, fingering, difficulty, description, csrf_token } = req.body || {};
    const sessionToken = getSessionToken(req);
    if (sessionToken && !(await validateCsrfToken(sessionToken, csrf_token))) {
      return res.status(403).json({ error: 'CSRF token tidak valid atau expired.' });
    }
    const errors = validateChord({ name, fingering, difficulty, description });
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });
    const chords = await getAllChords();
    let id = slugify(name);
    while (chords.some(c => c.id === id)) id = `${id}-${Date.now() % 10000}`;
    const chord = { id, name: String(name).trim(), fingering: String(fingering).trim(), difficulty: difficulty || 'Beginner', description: String(description || '').trim() };
    chords.push(chord);
    await saveAllChords(chords);
    return res.status(201).json({ chord });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}