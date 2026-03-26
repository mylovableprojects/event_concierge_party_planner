import { cookies } from 'next/headers'
import { verifySession, COOKIE_NAME } from '@/lib/auth'
import { getCompanyConfig, saveCompanyConfig } from '@/lib/inventory'
import { encrypt } from '@/lib/encryption'
import { validateAnthropicKey } from '@/lib/claude'

export async function POST(request: Request) {
  try {
    // Auth check
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const session = verifySession(token)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { apiKey } = await request.json() as { apiKey: string }
    console.log('[update-api-key] request body', {
      apiKey: typeof apiKey === 'string' ? `${apiKey.slice(0, 4)}…(${apiKey.length})` : apiKey,
      companyId: session.companyId,
    })

    if (!apiKey?.trim()) {
      return Response.json({ error: 'apiKey is required' }, { status: 400 })
    }

    // Validate before saving
    try {
      await validateAnthropicKey(apiKey.trim())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      return Response.json({ error: `Key validation failed: ${msg}` }, { status: 422 })
    }

    const config = await getCompanyConfig(session.companyId)
    if (!config) return Response.json({ error: 'Company not found' }, { status: 404 })

    const redisKey = `company:${config.id}:config`
    console.log('[update-api-key] writing config to', redisKey)

    await saveCompanyConfig({
      ...config,
      apiProvider: 'anthropic',
      encryptedApiKey: encrypt(apiKey.trim()),
    })

    console.log('[update-api-key] saveCompanyConfig OK', { companyId: config.id, redisKey })

    return Response.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('Update API key error:', err)
    const msg = err instanceof Error ? err.message : 'Something went wrong'
    return Response.json({ error: msg }, { status: 500 })
  }
}
