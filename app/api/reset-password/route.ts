import { NextRequest } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { getCompanyConfig, saveCompanyConfig } from '@/lib/inventory'

function verifyResetToken(token: string): { companyId: string; email: string } | null {
  try {
    const secret = process.env.SESSION_SECRET || 'dev-secret-change-SESSION_SECRET-in-production'
    const dot = token.lastIndexOf('.')
    if (dot === -1) return null
    const payload = token.slice(0, dot)
    const sig = token.slice(dot + 1)
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
    if (sig !== expected) return null
    const { companyId, email, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (exp < Date.now()) return null
    return { companyId, email }
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const { token, password } = await request.json() as { token: string; password: string }

  if (!token || !password) {
    return Response.json({ error: 'Missing token or password.' }, { status: 400 })
  }
  if (password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const session = verifyResetToken(token)
  if (!session) {
    return Response.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 })
  }

  const config = await getCompanyConfig(session.companyId)
  if (!config) {
    return Response.json({ error: 'Account not found.' }, { status: 404 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await saveCompanyConfig({ ...config, passwordHash })

  return Response.json({ ok: true })
}
