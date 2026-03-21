import OpenAI from 'openai'
import { InventoryItem, Rule } from './inventory'
import { ChatMessage, RecommendationResponse, buildSystemPrompt } from './claude'

export async function getRecommendationsOpenAI(
  messages: ChatMessage[],
  inventory: InventoryItem[],
  companyName: string,
  apiKey: string,
  activeRules: Rule[] = []
): Promise<RecommendationResponse> {
  const client = new OpenAI({ apiKey })

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 1024,
    messages: [
      { role: 'system', content: buildSystemPrompt(inventory, companyName, activeRules) },
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ],
  })

  const raw = response.choices[0]?.message?.content ?? ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as RecommendationResponse
    } catch { /* fall through */ }
  }

  return {
    message: raw.replace(/```[\s\S]*?```/g, '').trim(),
    recommendations: [],
    upsells: [],
    followUpQuestion: null,
  }
}

/** Validate an OpenAI key with a minimal 1-token call. */
export async function validateOpenAIKey(apiKey: string): Promise<void> {
  const client = new OpenAI({ apiKey })
  await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 1,
    messages: [{ role: 'user', content: 'hi' }],
  })
}
