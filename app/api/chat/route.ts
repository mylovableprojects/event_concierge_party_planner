import { NextRequest } from 'next/server'
import { getRecommendations, ChatMessage } from '@/lib/claude'
import { getInventory, getCompanyConfig, applyRules } from '@/lib/inventory'

export async function POST(request: NextRequest) {
  try {
    const { messages, companyId } = await request.json() as {
      messages: ChatMessage[]
      companyId: string
    }

    if (!messages?.length || !companyId) {
      return Response.json({ error: 'Missing messages or companyId' }, { status: 400 })
    }

    const config = getCompanyConfig(companyId)
    if (!config) {
      return Response.json({ error: 'Company not found' }, { status: 404 })
    }

    const inventory = getInventory(companyId)
    if (!inventory.length) {
      return Response.json({ error: 'No inventory found for this company' }, { status: 404 })
    }

    // Apply business rules — filter inventory and detect active rules
    const conversationText = messages.map(m => m.content).join(' ')
    const { activeRules, filteredInventory } = applyRules(
      inventory,
      config.rules || [],
      conversationText
    )

    const result = await getRecommendations(messages, filteredInventory, config.name, activeRules)
    return Response.json(result)
  } catch (err) {
    console.error('Chat API error:', err)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
