import { NextRequest } from 'next/server'
import { getCompanyConfig } from '@/lib/inventory'

interface LeadPayload {
  companyId: string
  firstName: string
  phone: string
  email?: string
  eventDate?: string
  eventDescription: string
  interestedItems: Array<{ name: string; price: number }>
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as LeadPayload
    const { companyId, firstName, phone, email, eventDate, eventDescription, interestedItems } = body

    if (!companyId || !firstName || !phone) {
      return Response.json({ error: 'companyId, firstName, and phone are required' }, { status: 400 })
    }

    const config = getCompanyConfig(companyId)
    if (!config) {
      return Response.json({ error: 'Company not found' }, { status: 404 })
    }

    const itemsSummary = interestedItems.map(i => `${i.name} ($${i.price})`).join(', ')
    const estimatedValue = interestedItems.reduce((sum, i) => sum + i.price, 0)

    // Fire webhook if configured
    if (config.webhookUrl) {
      const webhookPayload = {
        // GHL-friendly contact fields
        firstName,
        phone,
        email: email || '',
        // Event context as custom fields
        source: `${config.name} — Event Concierge`,
        eventDate: eventDate || '',
        eventDescription,
        interestedItems: itemsSummary,
        estimatedValue,
        companyId,
      }

      const webhookRes = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      })

      if (!webhookRes.ok) {
        console.error('Webhook delivery failed:', webhookRes.status, await webhookRes.text())
        // Still return success to the widget — don't block the user
      }
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Lead API error:', err)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
