/* === SAAS SECURITY LAYER === */
import { waff, rateLimit } from '../../lib/security';

export default async function handler(req, res) {
  await waff(req, res, () => {});
  await rateLimit(req, res, () => {});
  if (req.method !== 'GET') return res.status(405).end();
  res.status(200).json({ status: 'ok', message: 'ChordSpace API with SAAS Security Layer' });
}