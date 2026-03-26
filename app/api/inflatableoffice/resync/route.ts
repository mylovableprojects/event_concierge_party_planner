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
    if (!config.encryptedInflatableOfficeApiKey) {
      return Response.json({ error: 'Not connected' }, { status: 409 })
    }

    await saveCompanyConfig({
      ...config,
      inflatableOfficeLastSyncedAt: new Date().toISOString(),
    })

    return Response.json({ success: true })
  } catch (err) {
    console.error('InflatableOffice resync error:', err)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

