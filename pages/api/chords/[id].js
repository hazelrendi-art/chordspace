/* === SAAS SECURITY LAYER === */
import { waff, rateLimit } from '../../lib/security';

export default async function handler(req, res) {
  await waff(req, res, () => {});
  await rateLimit(req, res, () => {});
  if (req.method !== 'GET') return res.status(405).end();
  const { getChordById } = await import('../../lib/store');
  const { id } = req.query;
  const chord = await getChordById(id);
  if (!chord) return res.status(404).json({ error: 'Not found' });
  res.status(200).json(chord);
}