import crypto from 'crypto'

export const COOKIE_NAME = 'ec_session'
export const MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

function secret() {
  return process.env.SESSION_SECRET || 'dev-secret-change-SESSION_SECRET-in-production'
}

interface SessionPayload {
  companyId: string
  email: string
  exp: number
}

export function signSession(companyId: string, email: string): string {
  const payload: SessionPayload = {
    companyId,
    email,
    exp: Date.now() + MAX_AGE * 1000,
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', secret()).update(encoded).digest('base64url')
  return `${encoded}.${sig}`
}

export function verifySession(token: string): { companyId: string; email: string } | null {
  try {
    const dot = token.lastIndexOf('.')
    if (dot === -1) return null
    const encoded = token.slice(0, dot)
    const sig = token.slice(dot + 1)
    const expected = crypto.createHmac('sha256', secret()).update(encoded).digest('base64url')
    if (sig !== expected) return null
    const payload: SessionPayload = JSON.parse(Buffer.from(encoded, 'base64url').toString())
    if (payload.exp < Date.now()) return null
    return { companyId: payload.companyId, email: payload.email }
  } catch {
    return null
  }
}

export function sessionCookieOptions(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }
}
