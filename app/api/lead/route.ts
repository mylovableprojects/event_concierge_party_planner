import { NextRequest } from 'next/server'
import { getCompanyConfig, saveLead } from '@/lib/inventory'
import { decrypt } from '@/lib/encryption'
import { sendLeadEmail } from '@/lib/resend'
import { randomUUID } from 'crypto'

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

    const config = await getCompanyConfig(companyId)
    if (!config) {
      return Response.json({ error: 'Company not found' }, { status: 404 })
    }

    const itemsSummary = interestedItems.map(i => `${i.name} ($${i.price})`).join(', ')
    const estimatedValue = interestedItems.reduce((sum, i) => sum + i.price, 0)

    // 1. Always save lead locally
    await saveLead(companyId, {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      firstName,
      phone,
      email,
      eventDate,
      eventDescription,
      interestedItems,
      estimatedValue,
    })

    // 2. Fire webhook (if configured)
    if (config.webhookUrl) {
      const webhookPayload = {
        firstName,
        phone,
        email: email || '',
        source: `${config.name} — Event Concierge`,
        eventDate: eventDate || '',
        eventDescription,
        interestedItems: itemsSummary,
        estimatedValue,
        companyId,
      }
      fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      }).catch(err => console.error('Webhook delivery failed:', err))
    }

    // 3. Send email via owner's Resend key (if configured)
    if (config.encryptedResendKey && config.email) {
      try {
        const resendKey = decrypt(config.encryptedResendKey)
        await sendLeadEmail({
          apiKey: resendKey,
          toEmail: config.email,
          companyName: config.name,
          firstName,
          phone,
          email,
          eventDate,
          eventDescription,
          interestedItems,
          estimatedValue,
        })
      } catch (err) {
        console.error('Lead email failed:', err)
        // Don't block — lead is already saved
      }
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Lead API error:', err)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
