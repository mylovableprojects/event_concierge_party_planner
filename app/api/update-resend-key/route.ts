import { cookies } from 'next/headers'
import { verifySession, COOKIE_NAME } from '@/lib/auth'
import { getCompanyConfig, saveCompanyConfig } from '@/lib/inventory'
import { encrypt } from '@/lib/encryption'
import { validateResendKey } from '@/lib/resend'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const session = verifySession(token)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { apiKey } = await request.json() as { apiKey: string }
    if (!apiKey?.trim()) {
      return Response.json({ error: 'apiKey is required' }, { status: 400 })
    }

    try {
      await validateResendKey(apiKey.trim())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      return Response.json({ error: `Key validation failed: ${msg}` }, { status: 422 })
    }

    const config = await getCompanyConfig(session.companyId)
    if (!config) return Response.json({ error: 'Company not found' }, { status: 404 })

    await saveCompanyConfig({ ...config, encryptedResendKey: encrypt(apiKey.trim()) })
    return Response.json({ success: true })
  } catch (err) {
    console.error('Update Resend key error:', err)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
