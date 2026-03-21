import { NextRequest } from 'next/server'
import { getCompanyConfig, getInventory } from '@/lib/inventory'

export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('id')

  if (!companyId) {
    return Response.json({ error: 'Missing company id' }, { status: 400 })
  }

  const config = await getCompanyConfig(companyId)
  if (!config) {
    return Response.json({ error: 'Company not found' }, { status: 404 })
  }

  const inventory = await getInventory(companyId)

  return Response.json({ config, inventory })
}
