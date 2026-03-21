import { validateAnthropicKey } from '@/lib/claude'
import { validateOpenAIKey } from '@/lib/openai-ai'

export async function POST(request: Request) {
  try {
    const { provider, apiKey } = await request.json() as { provider: string; apiKey: string }

    if (!provider || !apiKey?.trim()) {
      return Response.json({ error: 'provider and apiKey are required' }, { status: 400 })
    }

    if (provider === 'anthropic') {
      await validateAnthropicKey(apiKey.trim())
    } else if (provider === 'openai') {
      await validateOpenAIKey(apiKey.trim())
    } else {
      return Response.json({ error: 'Unknown provider' }, { status: 400 })
    }

    return Response.json({ valid: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    // Surface the real API error message so the user understands what went wrong
    return Response.json({ valid: false, error: `Key validation failed: ${msg}` }, { status: 422 })
  }
}
