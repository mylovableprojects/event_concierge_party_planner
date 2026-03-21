import { cookies } from 'next/headers'
import { verifySession, COOKIE_NAME } from '@/lib/auth'
import { getCompanyConfig, saveCompanyConfig } from '@/lib/inventory'
import { encrypt } from '@/lib/encryption'
import { validateAnthropicKey } from '@/lib/claude'
import { validateOpenAIKey } from '@/lib/openai-ai'

export async function POST(request: Request) {
  try {
    // Auth check
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const session = verifySession(token)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { provider, apiKey } = await request.json() as { provider: string; apiKey: string }

    if (!provider || !apiKey?.trim()) {
      return Response.json({ error: 'provider and apiKey are required' }, { status: 400 })
    }
    if (provider !== 'anthropic' && provider !== 'openai') {
      return Response.json({ error: 'provider must be "anthropic" or "openai"' }, { status: 400 })
    }

    // Validate before saving
    try {
      if (provider === 'anthropic') await validateAnthropicKey(apiKey.trim())
      else await validateOpenAIKey(apiKey.trim())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      return Response.json({ error: `Key validation failed: ${msg}` }, { status: 422 })
    }

    const config = await getCompanyConfig(session.companyId)
    if (!config) return Response.json({ error: 'Company not found' }, { status: 404 })

    await saveCompanyConfig({
      ...config,
      apiProvider: provider as 'anthropic' | 'openai',
      encryptedApiKey: encrypt(apiKey.trim()),
    })

    return Response.json({ success: true })
  } catch (err) {
    console.error('Update API key error:', err)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
