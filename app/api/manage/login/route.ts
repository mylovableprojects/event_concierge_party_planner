import { NextRequest } from 'next/server'
import crypto from 'crypto'

export const MANAGE_COOKIE = 'ec_manage'
export const MANAGE_MAX_AGE = 8 * 60 * 60 // 8 hours

function signManageToken(): string {
  const password = process.env.SUPERADMIN_PASSWORD || 'changeme'
  const exp = Date.now() + MANAGE_MAX_AGE * 1000
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url')
  const sig = crypto.createHmac('sha256', password).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyManageToken(token: string): boolean {
  try {
    const password = process.env.SUPERADMIN_PASSWORD || 'changeme'
    const dot = token.lastIndexOf('.')
    if (dot === -1) return false
    const payload = token.slice(0, dot)
    const sig = token.slice(dot + 1)
    const expected = crypto.createHmac('sha256', password).update(payload).digest('base64url')
    if (sig !== expected) return false
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return exp > Date.now()
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const { password } = await request.json() as { password: string }
  const correct = process.env.SUPERADMIN_PASSWORD || 'changeme'

  if (password !== correct) {
    return Response.json({ error: 'Invalid password' }, { status: 401 })
  }

  const token = signManageToken()
  return Response.json({ ok: true }, {
    headers: {
      'Set-Cookie': `${MANAGE_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${MANAGE_MAX_AGE}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
    },
  })
}
