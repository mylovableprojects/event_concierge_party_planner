import { getIoRedis } from '@/lib/ioRedis'

function safeJsonParse<T>(str: string | null): T | null {
  if (!str) return null
  try {
    return JSON.parse(str) as T
  } catch {
    return null
  }
}

export type AdminIoStatus = {
  connected: boolean
  status: string
  lastSynced: string | null
}

export async function getAdminIoDashboard(companyId: string): Promise<{
  ioStatus: AdminIoStatus
  ioInventoryCount: number | null
  ioCategoriesCount: number | null
}> {
  if (!process.env.REDIS_URL) {
    return {
      ioStatus: { connected: false, status: 'not_configured', lastSynced: null },
      ioInventoryCount: null,
      ioCategoriesCount: null,
    }
  }

  const redis = getIoRedis()
  const bid = companyId.trim()

  const [encryptedKey, ioSyncRaw, inventoryRaw, categoriesRaw] = await Promise.all([
    redis.get(`business:${bid}:io_api_key`),
    redis.get(`business:${bid}:io_sync`),
    redis.get(`business:${bid}:inventory`),
    redis.get(`business:${bid}:io_categories`),
  ])

  const connected = !!encryptedKey
  const ioSync = safeJsonParse<{ lastSynced?: unknown; itemCount?: unknown; status?: unknown }>(ioSyncRaw)

  const lastSynced = ioSync && typeof ioSync.lastSynced === 'string' ? ioSync.lastSynced : null
  const status = ioSync && typeof ioSync.status === 'string'
    ? ioSync.status
    : (connected ? 'connected' : 'not_connected')

  const inv = safeJsonParse<unknown[]>(inventoryRaw)
  const ioInventoryCount = Array.isArray(inv) ? inv.length : null

  const categories = safeJsonParse<unknown>(categoriesRaw)
  const ioCategoriesCount =
    Array.isArray(categories) ? categories.length
      : Array.isArray((categories as { items?: unknown[] } | null)?.items) ? (categories as { items: unknown[] }).items.length
        : Array.isArray((categories as { categories?: unknown[] } | null)?.categories) ? (categories as { categories: unknown[] }).categories.length
          : null

  return {
    ioStatus: { connected, status, lastSynced },
    ioInventoryCount,
    ioCategoriesCount,
  }
}

