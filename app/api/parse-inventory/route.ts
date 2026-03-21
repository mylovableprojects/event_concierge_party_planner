import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM = `You are a data extraction assistant for a party rental company. Extract all rental inventory items from the provided text or image.

Return ONLY a raw JSON array. No markdown, no code fences, no explanation. Start your response with [ and end with ].

Each item must have:
- name (string, required — the rental item name)
- description (string — a short description, 1–2 sentences)
- price (number — the rental price as a number, no $ sign)
- category (string — one of: Inflatables, Water, Concessions, Furniture, Tents, Games, Entertainment, Toddler, Party Supplies, Other)
- tags (array of strings — e.g. ["tssa"] for certified equipment, empty array if none)
- ageMin (number — minimum suitable age, default 1)
- ageMax (number — maximum suitable age, default 99)
- guestCapacity (number — how many guests it accommodates, default 50)
- image (string — image URL if found, otherwise "")

If price is unclear or missing, use 0. Extract every item you can find. Be thorough.`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { mode: string; content?: string; data?: string; mediaType?: string }
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    let messages: Anthropic.MessageParam[]

    if (body.mode === 'text') {
      if (!body.content?.trim()) {
        return Response.json({ error: 'No content provided' }, { status: 400 })
      }
      messages = [{ role: 'user', content: `Extract rental inventory items from this:\n\n${body.content}` }]
    } else if (body.mode === 'image') {
      if (!body.data || !body.mediaType) {
        return Response.json({ error: 'No image provided' }, { status: 400 })
      }
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!validTypes.includes(body.mediaType)) {
        return Response.json({ error: 'Unsupported image type. Use JPG, PNG, or WebP.' }, { status: 400 })
      }
      messages = [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: body.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: body.data,
            },
          },
          { type: 'text', text: 'Extract all rental inventory items from this image.' },
        ],
      }]
    } else {
      return Response.json({ error: 'mode must be "text" or "image"' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      system: SYSTEM,
      messages,
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : '[]'
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) {
      return Response.json({ error: 'Could not extract any items — try adding more detail.' }, { status: 422 })
    }

    const parsed = JSON.parse(match[0]) as Array<Record<string, unknown>>
    const items = parsed.map(item => ({
      id: String(item.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `item-${Date.now()}`,
      name: String(item.name ?? ''),
      description: String(item.description ?? ''),
      price: Number(item.price) || 0,
      category: String(item.category ?? 'Other'),
      tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
      ageMin: Number(item.ageMin) || 1,
      ageMax: Number(item.ageMax) || 99,
      guestCapacity: Number(item.guestCapacity) || 50,
      image: String(item.image ?? ''),
    })).filter(item => item.name)

    if (!items.length) {
      return Response.json({ error: 'No items found — try providing more detail or a clearer image.' }, { status: 422 })
    }

    return Response.json({ items })
  } catch (err) {
    console.error('Parse inventory error:', err)
    return Response.json({ error: 'Failed to parse inventory' }, { status: 500 })
  }
}
