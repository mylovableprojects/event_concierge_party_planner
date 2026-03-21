import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { getCompanyConfig } from '@/lib/inventory'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const APP_URL = 'https://concierge.thepartyrentaltoolkit.com'
const PRICE_ID = 'price_1SzJDHGobXm0JvyhXJcPwvZ0'

export async function POST(request: NextRequest) {
  try {
    const { companyId } = await request.json() as { companyId: string }
    if (!companyId) {
      return Response.json({ error: 'Missing companyId' }, { status: 400 })
    }

    const config = getCompanyConfig(companyId)
    if (!config) {
      return Response.json({ error: 'Company not found' }, { status: 404 })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      customer_email: config.email,
      client_reference_id: companyId,
      success_url: `${APP_URL}/signup/success?company=${companyId}`,
      cancel_url: `${APP_URL}/signup?cancelled=1`,
      metadata: { companyId },
    })

    return Response.json({ url: session.url })
  } catch (err) {
    console.error('Checkout error:', err)
    return Response.json({ error: 'Could not create checkout session' }, { status: 500 })
  }
}
