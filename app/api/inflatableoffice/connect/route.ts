import { cookies } from 'next/headers'
import { verifySession, COOKIE_NAME } from '@/lib/auth'
import { getCompanyConfig, saveCompanyConfig } from '@/lib/inventory'
import { encrypt } from '@/lib/encryption'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const session = verifySession(token)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { apiKey } = await request.json() as { apiKey: string }
    if (!apiKey?.trim()) return Response.json({ error: 'apiKey is required' }, { status: 400 })

    const config = await getCompanyConfig(session.companyId)
    if (!config) return Response.json({ error: 'Company not found' }, { status: 404 })

    await saveCompanyConfig({
      ...config,
      encryptedInflatableOfficeApiKey: encrypt(apiKey.trim()),
      inflatableOfficeLastSyncedAt: new Date().toISOString(),
    })

    return Response.json({ success: true })
  } catch (err) {
    console.error('InflatableOffice connect error:', err)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

