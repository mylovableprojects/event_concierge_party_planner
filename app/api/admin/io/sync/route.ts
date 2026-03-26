import { decrypt } from '@/lib/encryption'
import { getIoRedis } from '@/lib/ioRedis'

export const runtime = 'nodejs'

type IoRental = Record<string, unknown> & {
  id?: string | number
  ridename?: string
  description?: string
  imageloc?: string
  imagelocbig?: string
  images?: Record<string, string>
  prices?: Record<string, number>
  allcats?: string
  wppages?: Array<{ url?: string }>
}

type IoRentalsResponse = {
  items?: IoRental[]
  count?: number | string
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchJson(url: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { method: 'GET' })
    if (res.status === 429) {
      await wait(2000)
      continue
    }
    const text = await res.text()
    try {
      return { ok: res.ok, json: JSON.parse(text) }
    } catch {
      return { ok: false, json: null }
    }
  }
  return { ok: false, json: null }
}

async function fetchAllRentals(apiKey: string) {
  const limit = 50
  let offset = 0
  let total: number | null = null
  const all: any[] = []

  while (total === null || offset < total) {
    const url = new URL('https://rental.software/api6/rentals')
    url.searchParams.set('apiKey', apiKey)
    url.searchParams.set('_body', 'true')
    url.searchParams.set('_prices', 'true')
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('offset', String(offset))

    const { ok, json } = await fetchJson(url.toString())
    const data = json as IoRentalsResponse | null
    const items = ok && data && Array.isArray(data.items) ? data.items : null
    let count: number | null = null
    if (ok && data) {
      const n = typeof data.count === 'number' ? data.count : Number(data.count)
      if (Number.isFinite(n)) count = n
    }

    if (!items || count === null) {
      throw new Error('Failed to fetch rentals from InflatableOffice')
    }

    total = count
    all.push(...items)
    offset += limit
  }

  return all
}

async function fetchAllCategories(apiKey: string) {
  const url = new URL('https://rental.software/api6/categories_list/')
  url.searchParams.set('apiKey', apiKey)
  const { ok, json } = await fetchJson(url.toString())
  if (!ok || json === null) throw new Error('Failed to fetch categories from InflatableOffice')
  return json
}

function toInventoryItem(item: IoRental) {
  const images = item.images && typeof item.images === 'object' ? Object.values(item.images) : []
  const pricesObj = item.prices && typeof item.prices === 'object' ? item.prices : {}
  const priceFrom8 = Object.prototype.hasOwnProperty.call(pricesObj, '8') ? pricesObj['8'] : 0
  const bookingUrl =
    item.wppages && Array.isArray(item.wppages) && item.wppages[0]?.url ? item.wppages[0].url : null

  return {
    id: item.id,
    name: item.ridename,
    description: item.description,
    image: item.imageloc,
    imageFull: item.imagelocbig,
    images,
    price: Number(priceFrom8) || 0,
    prices: item.prices,
    category: item.allcats,
    bookingUrl,
    source: 'inflatable_office',
    sourceId: item.id,
  }
}

export async function POST(request: Request) {
  const now = new Date()
  let bid: string | null = null
  let redis: ReturnType<typeof getIoRedis> | null = null

  try {
    redis = getIoRedis()
    const body = await request.json() as { businessId?: unknown; companyId?: unknown }
    const businessId = body.businessId ?? body.companyId
    if (!businessId || !String(businessId).trim()) {
      return Response.json({ error: 'businessId is required' }, { status: 400 })
    }

    bid = String(businessId).trim()
    const encryptedKey = await redis.get(`business:${bid}:io_api_key`)
    if (!encryptedKey) {
      return Response.json({ error: 'InflatableOffice is not connected' }, { status: 404 })
    }

    let apiKey: string
    try {
      apiKey = decrypt(encryptedKey)
    } catch (err) {
      console.error('[io-sync] decrypt failed for business:', bid, err)
      await redis.set(
        `business:${bid}:io_sync`,
        JSON.stringify({ lastSynced: now.toISOString(), itemCount: 0, status: 'failed', error: 'ENCRYPTION_SECRET mismatch' })
      )
      return Response.json({ error: 'InflatableOffice sync failed: ENCRYPTION_SECRET mismatch' }, { status: 500 })
    }

    const [rentals, categories] = await Promise.all([
      fetchAllRentals(apiKey),
      fetchAllCategories(apiKey),
    ])

    const inventory = rentals.map(toInventoryItem)

    await Promise.all([
      redis.set(`business:${bid}:inventory`, JSON.stringify(inventory)),
      redis.set(`business:${bid}:io_categories`, JSON.stringify(categories)),
      redis.set(
        `business:${bid}:io_sync`,
        JSON.stringify({ lastSynced: now.toISOString(), itemCount: inventory.length, status: 'success' })
      ),
      // legacy keys (keeps older status readers working)
      redis.set(`business:${bid}:io_inventory_last_synced_at`, now.toISOString()),
      redis.set(`business:${bid}:io_inventory_item_count`, String(inventory.length)),
    ])

    const categoriesCount =
      Array.isArray(categories) ? categories.length
        : Array.isArray((categories as any)?.items) ? (categories as any).items.length
          : Array.isArray((categories as any)?.categories) ? (categories as any).categories.length
            : 0

    return Response.json({ success: true, itemCount: inventory.length, categories: categoriesCount })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Something went wrong'
    if (bid && redis) {
      await redis.set(
        `business:${bid}:io_sync`,
        JSON.stringify({ lastSynced: now.toISOString(), itemCount: 0, status: 'failed', error: msg })
      )
    }
    console.error('IO sync route error:', err)
    return Response.json({ error: `InflatableOffice sync failed: ${msg}` }, { status: 500 })
  }
}

