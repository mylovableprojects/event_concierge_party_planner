import { NextRequest } from 'next/server'
import { getRecommendations, ChatMessage } from '@/lib/claude'
import { getRecommendationsOpenAI } from '@/lib/openai-ai'
import { getInventory, getCompanyConfig, applyRules } from '@/lib/inventory'
import { decrypt } from '@/lib/encryption'

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

    let apiKey: string
    const provider = config.apiProvider || 'anthropic'

    if (config.encryptedApiKey) {
      try {
        apiKey = decrypt(config.encryptedApiKey)
      } catch {
        return Response.json(
          { error: 'API key could not be decrypted. Please update your API key in the admin panel.' },
          { status: 400 }
        )
      }
    } else if (process.env.ANTHROPIC_API_KEY) {
      // Fall back to env key for the demo company
      apiKey = process.env.ANTHROPIC_API_KEY
    } else {
      return Response.json(
        { error: 'No API key configured. Please update your API key in the admin panel.' },
        { status: 400 }
      )
    }

    const inventory = getInventory(companyId)
    if (!inventory.length) {
      return Response.json({ error: 'No inventory found for this company' }, { status: 404 })
    }

    const conversationText = messages.map(m => m.content).join(' ')
    const { activeRules, filteredInventory } = applyRules(inventory, config.rules || [], conversationText)

    const result = provider === 'openai'
      ? await getRecommendationsOpenAI(messages, filteredInventory, config.name, apiKey, activeRules, config.customInstructions)
      : await getRecommendations(messages, filteredInventory, config.name, apiKey, activeRules, config.customInstructions)

    return Response.json(result)
  } catch (err) {
    console.error('Chat API error:', err)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
