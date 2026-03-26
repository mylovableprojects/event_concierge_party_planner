import { validateAnthropicKey } from '@/lib/claude'

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json() as { apiKey: string }

    if (!apiKey?.trim()) {
      return Response.json({ error: 'apiKey is required' }, { status: 400 })
    }

    await validateAnthropicKey(apiKey.trim())

    return Response.json({ valid: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    // Surface the real API error message so the user understands what went wrong
    return Response.json({ valid: false, error: `Key validation failed: ${msg}` }, { status: 422 })
  }
}
