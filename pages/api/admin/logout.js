/* === SAAS SECURITY LAYER === */
import { destroySession, getSessionToken } from '../../../lib/auth';
import { isBot } from '../../../lib/saas';

export default async function handler(req, res) {
  if (isBot(req)) return res.status(403).json({ error: 'Bot detected' });
  if (req.method !== 'POST') return res.status(405).end();
  const token = getSessionToken(req);
  if (token) await destroySession(req);
  res.setHeader('Set-Cookie', 'admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
  res.setHeader('X-SaaS-Logout', 'true');
  return res.status(200).json({ ok: true });
}