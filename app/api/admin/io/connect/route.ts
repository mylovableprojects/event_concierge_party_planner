import { encrypt } from '@/lib/encryption'
import { getIoRedis } from '@/lib/ioRedis'

export const runtime = 'nodejs'

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchRentalsTest(apiKey: string) {
  const url = new URL('https://rental.software/api6/rentals')
  url.searchParams.set('apiKey', apiKey)
  url.searchParams.set('limit', '1')

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url.toString(), { method: 'GET' })
    if (res.status === 429) {
      await wait(2000)
      continue
    }
    const text = await res.text()
    try {
      const json = JSON.parse(text)
      return { ok: res.ok, json }
    } catch {
      return { ok: false, json: null }
    }
  }

  return { ok: false, json: null }
}

export async function POST(request: Request) {
  try {
    const redis = getIoRedis()
    const body = await request.json() as any
    const apiKey = body?.apiKey
    const businessId = body?.businessId ?? body?.companyId

    console.log('[io-connect] businessId raw=', businessId)

    if (!apiKey || !String(apiKey).trim() || !businessId || !String(businessId).trim()) {
      return Response.json({ error: 'apiKey and businessId are required' }, { status: 400 })
    }

    const bid = String(businessId).trim()
    const writeKey = `business:${bid}:io_api_key`
    console.log('[io-connect] businessId=', bid)
    console.log('[io-connect] redis.set key=', writeKey)

    const validate = await fetchRentalsTest(String(apiKey).trim())
    const valid = validate.ok && validate.json && Array.isArray(validate.json.items)
    if (!valid) {
      return Response.json(
        { error: 'Invalid API key — please check your InflatableOffice settings' },
        { status: 400 }
      )
    }

    const setResult = await redis.set(writeKey, encrypt(String(apiKey).trim()))
    console.log('[io-connect] redis.set result=', setResult)

    // Trigger initial inventory sync immediately (server-side) via internal fetch to our sync route.
    const syncRes = await fetch(new URL('/api/admin/io/sync', request.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: bid }),
    })
    const syncJson = await syncRes.json()
    if (!syncRes.ok) {
      return Response.json({ error: syncJson?.error || 'InflatableOffice sync failed' }, { status: syncRes.status })
    }

    return Response.json({ success: true, itemCount: syncJson?.itemCount ?? 0 })
  } catch (err) {
    console.error('IO connect route error:', err)
    const msg = err instanceof Error ? err.message : 'Something went wrong'
    if (msg.includes('REDIS_URL')) {
      return Response.json({ error: 'InflatableOffice integration requires REDIS_URL to be set on the server.' }, { status: 500 })
    }
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

