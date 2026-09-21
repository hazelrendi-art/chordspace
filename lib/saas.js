/* === SAAS + SECURITY LAYER === */
export const PLAN_LIMITS = { free: 10, pro: 1000, enterprise: 99999 };
export const RATE_LIMITS = { free: '10/min', pro: '300/min', enterprise: '3000/min' };
export const BOT_SIGNS = ['bot', 'crawler', 'spider', 'scrape', 'python-requests', 'curl', 'wget', 'headless'];
export function isBot(req) {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  return BOT_SIGNS.some(s => ua.includes(s)) || !ua;
}
export function detectScraping(req) {
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const ua = req.headers['user-agent'] || '';
  return { bot: isBot(req), suspiciousIp: ip.includes('proxy') || ip.includes('tor'), lowUa: ua.length < 10 };
}
export function honeypotCheck(body) {
  return body?.website || body?.email_fake ? 'honeypot_trap' : null;
}
export async function getUserTier(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/user_tier=([a-z]+)/);
  return match ? match[1] : 'free';
}
