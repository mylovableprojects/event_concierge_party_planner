import { cookies } from 'next/headers'
import { verifySession, COOKIE_NAME } from '@/lib/auth'
import { getCompanyConfig, saveCompanyConfig } from '@/lib/inventory'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const session = verifySession(token)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const config = await getCompanyConfig(session.companyId)
    if (!config) return Response.json({ error: 'Company not found' }, { status: 404 })

    await saveCompanyConfig({
      ...config,
      encryptedInflatableOfficeApiKey: undefined,
      inflatableOfficeLastSyncedAt: undefined,
    })

    return Response.json({ success: true })
  } catch (err) {
    console.error('InflatableOffice disconnect error:', err)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

