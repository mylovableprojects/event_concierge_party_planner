import { cookies } from 'next/headers'
import { verifySession, COOKIE_NAME } from '@/lib/auth'
import { getCompanyConfig, getInventory, saveInventory, InventoryItem } from '@/lib/inventory'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const session = verifySession(token)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const inventory = await getInventory(session.companyId)
    return Response.json({ inventory })
  } catch (err) {
    console.error('GET inventory error:', err)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const session = verifySession(token)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const config = await getCompanyConfig(session.companyId)
    if (!config) return Response.json({ error: 'Company not found' }, { status: 404 })

    const { inventory } = await request.json() as { inventory: InventoryItem[] }
    if (!Array.isArray(inventory)) {
      return Response.json({ error: 'inventory must be an array' }, { status: 400 })
    }

    await saveInventory(session.companyId, inventory)
    return Response.json({ success: true, itemCount: inventory.length })
  } catch (err) {
    console.error('PUT inventory error:', err)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
