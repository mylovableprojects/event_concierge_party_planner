import Redis from 'ioredis'
import { encrypt } from '@/lib/encryption'

function getRedis() {
  if (!process.env.REDIS_URL) throw new Error('REDIS_URL env var is not set')
  if (!globalThis.__ioRedis) {
    globalThis.__ioRedis = new Redis(process.env.REDIS_URL)
  }
  return globalThis.__ioRedis
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchRentals({ apiKey, limit }) {
  const url = new URL('https://rental.software/api6/rentals')
  url.searchParams.set('apiKey', apiKey)
  url.searchParams.set('limit', String(limit))

  let lastText = ''
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url.toString(), { method: 'GET' })
    if (res.status === 429) {
      await wait(2000)
      continue
    }
    lastText = await res.text()
    let json
    try {
      json = JSON.parse(lastText)
    } catch {
      return { ok: false, json: null }
    }
    return { ok: res.ok, json }
  }

  return { ok: false, json: null }
}

async function initialInventorySync({ apiKey, businessId }) {
  // Use pagination with limit=50 to respect IO rate limits safely.
  const limit = 50
  let offset = 0
  let total = null
  const items = []

  while (total === null || offset < total) {
    const url = new URL('https://rental.software/api6/rentals')
    url.searchParams.set('apiKey', apiKey)
    url.searchParams.set('_body', 'true')
    url.searchParams.set('_prices', 'true')
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('offset', String(offset))

    const res = await fetch(url.toString(), { method: 'GET' })
    if (res.status === 429) {
      await wait(2000)
      continue
    }
    const text = await res.text()
    let json
    try {
      json = JSON.parse(text)
    } catch {
      throw new Error('Failed to sync inventory from InflatableOffice')
    }
    const batch = res.ok && json && Array.isArray(json.items) ? json.items : null
    const count = res.ok && json && (typeof json.count === 'number' ? json.count : Number(json.count))
    if (!batch || !Number.isFinite(count)) {
      throw new Error('Failed to sync inventory from InflatableOffice')
    }
    total = count
    items.push(...batch)
    offset += limit
  }

  const redis = getRedis()
  const now = new Date().toISOString()
  await redis.set(`business:${businessId}:io_inventory_last_synced_at`, now)
  await redis.set(`business:${businessId}:io_inventory_item_count`, String(items.length))

  // Optional snapshot to support downstream processing without re-fetching.
  await redis.set(`business:${businessId}:io_inventory_snapshot`, JSON.stringify(items))

  return { itemCount: items.length }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const apiKey = body?.apiKey
    const businessId = body?.businessId ?? body?.companyId

    if (!apiKey || !String(apiKey).trim() || !businessId || !String(businessId).trim()) {
      return Response.json({ error: 'apiKey and businessId are required' }, { status: 400 })
    }

    const bid = String(businessId).trim()
    const writeKey = `business:${bid}:io_api_key`
    console.log('[io-connect] businessId=', bid)
    console.log('[io-connect] redis.set key=', writeKey)

    // Validate by making a test call.
    const validate = await fetchRentals({ apiKey: String(apiKey).trim(), limit: 1 })
    const valid = validate.ok && validate.json && Array.isArray(validate.json.items)
    if (!valid) {
      return Response.json(
        { error: 'Invalid API key — please check your InflatableOffice settings' },
        { status: 400 }
      )
    }

    const redis = getRedis()
    const setResult = await redis.set(writeKey, encrypt(String(apiKey).trim()))
    console.log('[io-connect] redis.set result=', setResult)

    // Trigger initial inventory sync immediately after connecting.
    try {
      const { itemCount } = await initialInventorySync({ apiKey: String(apiKey).trim(), businessId: bid })
      return Response.json({ success: true, itemCount })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      await redis.set(
        `business:${bid}:io_sync`,
        JSON.stringify({ lastSynced: new Date().toISOString(), itemCount: 0, status: 'failed', error: msg })
      )
      return Response.json({ error: `InflatableOffice sync failed: ${msg}` }, { status: 500 })
    }

  } catch (err) {
    console.error('IO connect route error:', err)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

