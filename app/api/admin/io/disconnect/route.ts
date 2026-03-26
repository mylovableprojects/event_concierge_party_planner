import { getIoRedis } from '@/lib/ioRedis'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json() as any
    const businessId = body?.businessId ?? body?.companyId
    if (!businessId || !String(businessId).trim()) {
      return Response.json({ error: 'businessId is required' }, { status: 400 })
    }

    const bid = String(businessId).trim()
    const redis = getIoRedis()

    // Remove the key; keep inventory snapshot unless you want to wipe it too.
    await redis.del(`business:${bid}:io_api_key`)
    await redis.del(`business:${bid}:io_sync`)
    await redis.del(`business:${bid}:io_inventory_last_synced_at`)
    await redis.del(`business:${bid}:io_inventory_item_count`)

    return Response.json({ success: true })
  } catch (err) {
    console.error('IO disconnect route error:', err)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

