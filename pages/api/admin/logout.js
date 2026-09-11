import { destroySession, getSessionToken } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end()
  }
  const token = getSessionToken(req)
  if (token) await destroySession(req)
  res.setHeader('Set-Cookie', 'admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0')
  return res.status(200).json({ ok: true })
}
