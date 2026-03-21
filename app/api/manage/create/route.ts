import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { getCompanyConfig, saveCompanyConfig, saveInventory, findCompanyByEmail } from '@/lib/inventory'
import { verifyManageToken, MANAGE_COOKIE } from '../login/route'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get(MANAGE_COOKIE)?.value
  if (!token || !verifyManageToken(token)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { companyName, yourName, email, phone, password } =
    await request.json() as Record<string, string>

  if (!companyName?.trim() || !email?.trim() || !password) {
    return Response.json({ error: 'Company name, email, and password are required.' }, { status: 400 })
  }

  const companyId = companyName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  if (await getCompanyConfig(companyId)) {
    return Response.json({ error: 'A company with that name already exists.' }, { status: 409 })
  }
  if (await findCompanyByEmail(email.trim())) {
    return Response.json({ error: 'An account with that email already exists.' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await saveCompanyConfig({
    id: companyId,
    name: companyName.trim(),
    tagline: 'Find the perfect rentals',
    primaryColor: '#B03A3A',
    accentColor: '#E8A020',
    navyColor: '#1E2B3C',
    logoText: companyName.trim().slice(0, 2).toUpperCase(),
    allowedOrigins: ['*'],
    cartMode: 'hidden',
    cartInquireUrl: '',
    webhookUrl: '',
    rules: [],
    yourName: yourName?.trim() || '',
    phone: phone?.trim() || '',
    email: email.trim().toLowerCase(),
    passwordHash,
    subscriptionActive: true,
  })
  await saveInventory(companyId, [])

  return Response.json({ ok: true, companyId })
}
