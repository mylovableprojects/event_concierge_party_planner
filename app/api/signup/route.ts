import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getCompanyConfig, saveCompanyConfig, saveInventory, findCompanyByEmail } from '@/lib/inventory'
import { signSession, sessionCookieOptions } from '@/lib/auth'
import { encrypt } from '@/lib/encryption'
import { validateAnthropicKey } from '@/lib/claude'
import { validateOpenAIKey } from '@/lib/openai-ai'

export async function POST(request: Request) {
  try {
    const { companyName, yourName, email, password, phone, apiProvider, apiKey } =
      await request.json() as Record<string, string>

    if (!companyName?.trim() || !yourName?.trim() || !email?.trim() || !password) {
      return Response.json({ error: 'All fields are required.' }, { status: 400 })
    }
    if (!apiProvider || !apiKey?.trim()) {
      return Response.json({ error: 'An API key and provider are required.' }, { status: 400 })
    }
    if (apiProvider !== 'anthropic' && apiProvider !== 'openai') {
      return Response.json({ error: 'Invalid API provider.' }, { status: 400 })
    }
    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const companyId = companyName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (!companyId) {
      return Response.json({ error: 'Company name is invalid.' }, { status: 400 })
    }

    if (getCompanyConfig(companyId)) {
      return Response.json({ error: 'A company with that name already exists. Try adding your city or a unique word.' }, { status: 409 })
    }
    if (findCompanyByEmail(email.trim())) {
      return Response.json({ error: 'An account with that email already exists.' }, { status: 409 })
    }

    // Validate API key before saving anything
    try {
      if (apiProvider === 'anthropic') await validateAnthropicKey(apiKey.trim())
      else await validateOpenAIKey(apiKey.trim())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      return Response.json({ error: `API key validation failed: ${msg}` }, { status: 422 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const encryptedApiKey = encrypt(apiKey.trim())

    saveCompanyConfig({
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
      yourName: yourName.trim(),
      phone: phone?.trim() || '',
      email: email.trim().toLowerCase(),
      passwordHash,
      apiProvider: apiProvider as 'anthropic' | 'openai',
      encryptedApiKey,
    })
    saveInventory(companyId, [])

    const token = signSession(companyId, email.trim().toLowerCase())
    const res = NextResponse.json({ success: true, companyId })
    res.cookies.set(sessionCookieOptions(token))
    return res
  } catch (err) {
    console.error('Signup error:', err)
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
