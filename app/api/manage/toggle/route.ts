import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { getCompanyConfig, saveCompanyConfig } from '@/lib/inventory'
import { verifyManageToken, MANAGE_COOKIE } from '../login/route'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get(MANAGE_COOKIE)?.value
  if (!token || !verifyManageToken(token)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { companyId, active } = await request.json() as { companyId: string; active: boolean }
  const config = await getCompanyConfig(companyId)
  if (!config) {
    return Response.json({ error: 'Company not found' }, { status: 404 })
  }

  await saveCompanyConfig({ ...config, subscriptionActive: active })
  return Response.json({ ok: true, companyId, active })
}
