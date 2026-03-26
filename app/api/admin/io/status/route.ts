import { getIoRedis } from '@/lib/ioRedis'

function safeJsonParse(str: string | null): any {
  if (!str) return null
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const businessId = url.searchParams.get('businessId') ?? url.searchParams.get('companyId')
    if (!businessId || !businessId.trim()) {
      return Response.json({ error: 'businessId is required' }, { status: 400 })
    }

    const bid = businessId.trim()
    const redis = getIoRedis()
    const key = `business:${bid}:io_api_key`

    console.log('[io-status] businessId=', bid)
    console.log('[io-status] redis.get key=', key)

    const [encryptedKey, ioSyncRaw, legacyLastSynced, legacyItemCountRaw] = await Promise.all([
      redis.get(key),
      redis.get(`business:${bid}:io_sync`),
      redis.get(`business:${bid}:io_inventory_last_synced_at`),
      redis.get(`business:${bid}:io_inventory_item_count`),
    ])

    console.log('[io-status] redis.get raw=', encryptedKey)

    const connected = !!encryptedKey
    const ioSync = safeJsonParse(ioSyncRaw)

    const lastSynced =
      (ioSync && typeof ioSync.lastSynced === 'string' && ioSync.lastSynced) ||
      (legacyLastSynced || null)

    const itemCount =
      (ioSync && Number.isFinite(Number(ioSync.itemCount)) ? Number(ioSync.itemCount) : null) ??
      (legacyItemCountRaw && Number.isFinite(Number(legacyItemCountRaw)) ? Number(legacyItemCountRaw) : 0)

    const status =
      (ioSync && typeof ioSync.status === 'string' && ioSync.status) ||
      (connected ? 'connected' : 'not_connected')

    return Response.json({ success: true, connected, status, lastSynced, itemCount })
  } catch (err) {
    console.error('IO status route error:', err)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

