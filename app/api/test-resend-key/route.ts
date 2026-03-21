import { validateResendKey } from '@/lib/resend'

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json() as { apiKey: string }
    if (!apiKey?.trim()) {
      return Response.json({ error: 'apiKey is required' }, { status: 400 })
    }
    await validateResendKey(apiKey.trim())
    return Response.json({ valid: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ valid: false, error: msg }, { status: 422 })
  }
}
