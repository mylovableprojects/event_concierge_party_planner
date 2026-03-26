import Redis from 'ioredis'
import { decrypt } from '@/lib/encryption'

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

async function fetchJson(url) {
  let lastText = ''
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { method: 'GET' })
    if (res.status === 429) {
      await wait(2000)
      continue
    }
    lastText = await res.text()
    try {
      return { ok: res.ok, json: JSON.parse(lastText) }
    } catch {
      return { ok: false, json: null }
    }
  }

  return { ok: false, json: null }
}

async function fetchAllRentals({ apiKey }) {
  const limit = 50
  let offset = 0
  let total = null
  const all = []

  while (total === null || offset < total) {
    const url = new URL('https://rental.software/api6/rentals')
    url.searchParams.set('apiKey', apiKey)
    url.searchParams.set('_body', 'true')
    url.searchParams.set('_prices', 'true')
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('offset', String(offset))

    const { ok, json } = await fetchJson(url.toString())
    const items = ok && json && Array.isArray(json.items) ? json.items : null
    const count = ok && json && (typeof json.count === 'number' ? json.count : Number(json.count))

    if (!items || !Number.isFinite(count)) {
      throw new Error('Failed to fetch rentals from InflatableOffice')
    }

    total = count
    all.push(...items)
    offset += limit
  }

  return all
}

async function fetchAllCategories({ apiKey }) {
  const url = new URL('https://rental.software/api6/categories_list/')
  url.searchParams.set('apiKey', apiKey)
  const { ok, json } = await fetchJson(url.toString())
  if (!ok || json === null) throw new Error('Failed to fetch categories from InflatableOffice')
  return json
}

function toInventoryItem(item) {
  const images = item && item.images && typeof item.images === 'object' ? Object.values(item.images) : []
  const pricesObj = item && item.prices && typeof item.prices === 'object' ? item.prices : {}
  // IO pricing uses hours as keys; always use '8' as the primary display price.
  const priceFrom8 = pricesObj && Object.prototype.hasOwnProperty.call(pricesObj, '8') ? pricesObj['8'] : 0

  const bookingUrl =
    item && item.wppages && Array.isArray(item.wppages) && item.wppages[0] && item.wppages[0].url
      ? item.wppages[0].url
      : null

  return {
    id: item?.id,
    name: item?.ridename,
    description: item?.description,
    image: item?.imageloc,
    imageFull: item?.imagelocbig,
    images,
    price: Number(priceFrom8) || 0,
    prices: item?.prices,
    category: item?.allcats,
    bookingUrl,
    source: 'inflatable_office',
    sourceId: item?.id,
  }
}

export async function POST(request) {
  const redis = getRedis()
  const now = new Date()
  let bid = null

  try {
    const { businessId } = await request.json()
    if (!businessId || !String(businessId).trim()) {
      return Response.json({ error: 'businessId is required' }, { status: 400 })
    }

    bid = String(businessId).trim()
    const encryptedKey = await redis.get(`business:${bid}:io_api_key`)
    if (!encryptedKey) {
      return Response.json({ error: 'InflatableOffice is not connected' }, { status: 404 })
    }

    const apiKey = decrypt(encryptedKey)

    const [rentals, categories] = await Promise.all([
      fetchAllRentals({ apiKey }),
      fetchAllCategories({ apiKey }),
    ])

    const inventory = rentals.map(toInventoryItem)

    await Promise.all([
      redis.set(`business:${bid}:inventory`, JSON.stringify(inventory)),
      redis.set(`business:${bid}:io_categories`, JSON.stringify(categories)),
      redis.set(
        `business:${bid}:io_sync`,
        JSON.stringify({ lastSynced: now.toISOString(), itemCount: inventory.length, status: 'success' })
      ),
    ])

    const categoriesCount =
      Array.isArray(categories) ? categories.length
        : (categories && Array.isArray(categories.items)) ? categories.items.length
          : (categories && Array.isArray(categories.categories)) ? categories.categories.length
            : 0

    return Response.json({ success: true, itemCount: inventory.length, categories: categoriesCount })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Something went wrong'

    if (bid) {
      await redis.set(
        `business:${bid}:io_sync`,
        JSON.stringify({
          lastSynced: now.toISOString(),
          itemCount: 0,
          status: 'failed',
          error: msg,
        })
      )
    }

    console.error('IO sync route error:', err)
    return Response.json({ error: `InflatableOffice sync failed: ${msg}` }, { status: 500 })
  }
}

