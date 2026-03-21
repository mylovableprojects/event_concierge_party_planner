import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { getCompanyConfig, saveCompanyConfig, getAllCompanyConfigs } from '@/lib/inventory'

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: 'Payment not configured' }, { status: 500 })
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const companyId = session.client_reference_id || session.metadata?.companyId
    if (!companyId) {
      console.error('Webhook: no companyId on session', session.id)
      return Response.json({ error: 'No companyId' }, { status: 400 })
    }

    const config = await getCompanyConfig(companyId)
    if (!config) {
      console.error('Webhook: company not found', companyId)
      return Response.json({ error: 'Company not found' }, { status: 404 })
    }

    await saveCompanyConfig({
      ...config,
      subscriptionActive: true,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
    })

    console.log(`Subscription activated for ${companyId}`)
  }

  if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.paused') {
    const sub = event.data.object as Stripe.Subscription
    const all = await getAllCompanyConfigs()
    const config = all.find(c => c.stripeSubscriptionId === sub.id)
    if (config) {
      await saveCompanyConfig({ ...config, subscriptionActive: false })
      console.log(`Subscription deactivated for ${config.id}`)
    }
  }

  return Response.json({ received: true })
}
