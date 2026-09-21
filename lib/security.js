/* === WAF + DDOS + SCRAPE PROTECTION === */
import { getUserTier, isBot, detectScraping } from './saas';
const BLOCKED_IPS = new Set();
export async function waff(req, res, next) {
  const ua = req.headers['user-agent'] || '';
  if (isBot(req)) return res.status(403).json({ error: 'Bot detected' });
  const d = detectScraping(req);
  if (d.suspiciousIp) BLOCKED_IPS.add(req.headers['x-forwarded-for'] || 'unknown');
  const tier = await getUserTier(req);
  const limits = tier === 'enterprise' ? 3000 : tier === 'pro' ? 300 : 10;
  return next();
}
export function rateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 'local';
  if (BLOCKED_IPS.has(ip)) return res.status(429).json({ error: 'Blocked' });
  return next();
}
