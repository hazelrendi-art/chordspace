/* === ADMIN LOGIN WITH BOT PROTECTION === */
import { checkPassword, checkRateLimit, createSession, generateCsrfToken } from '../../../lib/auth';
import { isBot, honeypotCheck, detectScraping } from '../../../lib/saas';

export default async function handler(req, res) {
  if (isBot(req)) return res.status(403).json({ error: 'Bot detected' });
  const d = detectScraping(req);
  if (d.bot || d.suspiciousIp) return res.status(403).json({ error: 'Blocked' });
  if (honeypotCheck(req.body)) return res.status(403).json({ error: 'Invalid request' });

  if (req.method !== 'POST') return res.status(405).end();
  const limit = checkRateLimit(req);
  if (!limit.allowed) return res.status(429).json({ error: `Too many attempts. Try in ${limit.retryAfter}s.` });

  if (!req.body?.password) return res.status(400).json({ error: 'Password required' });
  if (!checkPassword(req.body.password)) return res.status(401).json({ error: 'Invalid credentials' });

  const sessionToken = await createSession(req);
  const csrf = await generateCsrfToken(sessionToken);
  res.setHeader('Set-Cookie', `admin_session=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`);
  res.setHeader('X-SaaS-Tier', 'admin');
  res.status(200).json({ ok: true, csrf_token: csrf, tier: 'admin' });
}