import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { findCompanyByEmail } from '@/lib/inventory'
import { signSession, sessionCookieOptions } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json() as { email: string; password: string }

    if (!email?.trim() || !password) {
      return Response.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    const config = await findCompanyByEmail(email.trim())
    if (!config || !config.passwordHash) {
      return Response.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, config.passwordHash)
    if (!valid) {
      return Response.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const token = signSession(config.id, config.email!)
    const res = NextResponse.json({ success: true, companyId: config.id })
    res.cookies.set(sessionCookieOptions(token))
    return res
  } catch (err) {
    console.error('Login error:', err)
    return Response.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
