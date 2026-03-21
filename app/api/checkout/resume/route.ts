import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { verifySession, COOKIE_NAME } from '@/lib/auth'
import { getCompanyConfig } from '@/lib/inventory'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const APP_URL = 'https://concierge.thepartyrentaltoolkit.com'
const PRICE_ID = 'price_1TDRImGobXm0JvyhYs14SOti'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const session = verifySession(token)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const config = getCompanyConfig(session.companyId)
    if (!config) return Response.json({ error: 'Company not found' }, { status: 404 })

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      customer_email: config.email,
      client_reference_id: session.companyId,
      success_url: `${APP_URL}/signup/success?company=${session.companyId}`,
      cancel_url: `${APP_URL}/subscribe`,
      metadata: { companyId: session.companyId },
    })

    return Response.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('Checkout resume error:', err)
    return Response.json({ error: 'Could not create checkout session' }, { status: 500 })
  }
}
