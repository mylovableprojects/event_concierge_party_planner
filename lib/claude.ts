import Anthropic from '@anthropic-ai/sdk'
import { InventoryItem, Rule } from './inventory'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface RecommendationResponse {
  message: string
  recommendations: Array<{ id: string; reason: string }>
  upsells: Array<{ id: string; reason: string }>
  followUpQuestion: string | null
}

export function buildSystemPrompt(inventory: InventoryItem[], companyName: string, activeRules: Rule[] = [], customInstructions?: string): string {
  const catalog = inventory.map(item =>
    `- ID: ${item.id} | ${item.name} | $${item.price} | Category: ${item.category} | Ages: ${item.ageMin}–${item.ageMax} | Capacity: up to ${item.guestCapacity} guests | Tags: ${item.tags.join(', ')}\n  Description: ${item.description}`
  ).join('\n\n')

  const rulesSection = activeRules.length > 0
    ? `\nACTIVE FILTERS:\n${activeRules.map(r =>
        `- ${r.name}: ${r.message} (the catalog has already been filtered to only show eligible items)`
      ).join('\n')}\nMention this filter naturally in your message so the customer understands why they're seeing these specific items.\n`
    : ''

  return `You are the Event Concierge for ${companyName}, a friendly AI assistant that helps customers find the perfect party rentals for their event.

Your job is to recommend the most relevant rentals from the catalog below based on the customer's event description. Be warm, enthusiastic, and conversational — like a knowledgeable party planning friend.
${rulesSection}
CATALOG:
${catalog}

RESPONSE FORMAT:
You MUST respond with raw valid JSON only — no markdown, no code fences, no extra text before or after. Start your response with { and end with }. Use this exact format:
{
  "message": "Your warm, conversational response to the customer (2-3 sentences max)",
  "recommendations": [
    { "id": "item-id-here", "reason": "one short sentence why this is perfect for their event" }
  ],
  "upsells": [
    { "id": "item-id-here", "reason": "one short sentence why they might love this add-on" }
  ],
  "followUpQuestion": "A single follow-up question to narrow down recommendations further, or null if you have enough info"
}

RULES:
- recommendations: 2–4 items that directly match their event needs (inflatables, main attractions)
- upsells: 2–3 add-on items they would enjoy (concessions, decor, furniture — things that complement the main items)
- Never recommend items outside the catalog
- Only use IDs exactly as listed in the catalog
- If the event description is vague, ask a follow-up question to get more details (age, guest count, theme, indoor/outdoor)
- If they have enough info, set followUpQuestion to null
- Consider age groups, guest count, and themes when recommending
- Concession machines and decor are always great upsells for birthday parties
${customInstructions ? `\nBUSINESS-SPECIFIC INSTRUCTIONS (follow these exactly):\n${customInstructions}` : ''}`
}

export async function getRecommendations(
  messages: ChatMessage[],
  inventory: InventoryItem[],
  companyName: string,
  apiKey: string,
  activeRules: Rule[] = [],
  customInstructions?: string
): Promise<RecommendationResponse> {
  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: buildSystemPrompt(inventory, companyName, activeRules, customInstructions),
    messages,
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''

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

/** Validate an Anthropic key with a minimal 1-token call. */
export async function validateAnthropicKey(apiKey: string): Promise<void> {
  const client = new Anthropic({ apiKey })
  await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1,
    messages: [{ role: 'user', content: 'hi' }],
  })
}
