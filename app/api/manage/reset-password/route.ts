import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { getCompanyConfig, saveCompanyConfig } from '@/lib/inventory'
import { verifyManageToken, MANAGE_COOKIE } from '../login/route'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get(MANAGE_COOKIE)?.value
  if (!token || !verifyManageToken(token)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { companyId, password } = await request.json() as { companyId: string; password: string }
  if (!password || password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const config = await getCompanyConfig(companyId)
  if (!config) {
    return Response.json({ error: 'Company not found' }, { status: 404 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await saveCompanyConfig({ ...config, passwordHash })
  return Response.json({ ok: true })
}
