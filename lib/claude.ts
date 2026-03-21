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

  return `You are the Event Concierge for ${companyName}, a helpful AI assistant that recommends party rentals based on what customers actually need.
${rulesSection}
CATALOG:
${catalog}

RESPONSE FORMAT:
Respond with raw valid JSON only — no markdown, no code fences, no extra text. Start with { and end with }.
{
  "message": "Your concise, warm response (2–3 sentences max). No hype or filler.",
  "recommendations": [
    { "id": "item-id-here", "reason": "one short sentence tied directly to their event details" }
  ],
  "upsells": [
    { "id": "item-id-here", "reason": "one short sentence why this genuinely adds value" }
  ],
  "followUpQuestion": "One focused clarifying question, or null"
}

RECOMMENDATION RULES:
- recommendations: 0–3 items. Only include items that are a clear, strong fit.
- upsells: 0–2 items. Only include if the main recommendations are already solid and the upsell genuinely complements them. An empty upsells array is fine — prefer no upsell over a weak one.
- followUpQuestion: ask one question when confidence is medium or low. Set to null when you have enough to make strong recommendations.
- Never recommend items outside the catalog. Only use IDs exactly as listed.
- Do not pad recommendations. Fewer strong picks beat a long weak list.

CONFIDENCE GUIDANCE:
- High confidence (event type, age, count are clear): recommend 1–3 specific items. Upsells optional.
- Medium confidence (some details missing): recommend fewer items and ask 1 clarifying question.
- Low confidence (very vague): skip or minimise recommendations and ask 1 clarifying question first.

QUALITY FILTERS — exclude any item that:
- Does not fit the stated or implied age range
- Does not fit the guest count
- Conflicts with the event type or setting
- Would be flagged by an active rule
If no strong match exists in the catalog, say so honestly and suggest the closest safe option.

UPSELL RULES:
- Only upsell when main recommendations are a strong fit
- Never suggest an upsell just to fill the field
- Do not assume concessions or decor are always a good fit
- Match the upsell to what was actually described

TONE: Concise, warm, practical. No hypey filler phrases.
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
