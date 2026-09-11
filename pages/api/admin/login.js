import { checkPassword, checkRateLimit, createSession, generateCsrfToken } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const limit = checkRateLimit(req)
  if (!limit.allowed) {
    res.setHeader('Retry-After', limit.retryAfter)
    return res.status(429).json({ error: `Terlalu banyak usaha. Coba lagi dalam ${limit.retryAfter}s.` })
  }

  if (!req.body || !req.body.password) {
    return res.status(400).json({ error: 'Password wajib diisi.' })
  }

  if (!checkPassword(req.body.password)) {
    return res.status(401).json({ error: 'Password admin salah!' })
  }

  const sessionToken = await createSession(req)
  const csrf = await generateCsrfToken(sessionToken)

  res.setHeader('Set-Cookie',
    `admin_session=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`)

  return res.status(200).json({ ok: true, csrf_token: csrf })
}
}
