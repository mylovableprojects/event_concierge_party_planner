import { NextRequest } from 'next/server'
import {
  parseInventoryCSV,
  saveInventory,
  saveCompanyConfig,
  getCompanyConfig,
  CompanyConfig,
} from '@/lib/inventory'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const companyId = (formData.get('companyId') as string)?.trim()
    const companyName = (formData.get('companyName') as string)?.trim()
    const primaryColor = (formData.get('primaryColor') as string) || '#B03A3A'
    const accentColor = (formData.get('accentColor') as string) || '#E8A020'
    const navyColor = (formData.get('navyColor') as string) || '#1E2B3C'
    const logoText = (formData.get('logoText') as string) || companyName?.slice(0, 2).toUpperCase() || 'PP'
    const cartMode = ((formData.get('cartMode') as string) || 'enabled') as 'enabled' | 'inquire' | 'hidden'
    const cartInquireUrl = (formData.get('cartInquireUrl') as string) || ''
    const webhookUrl = (formData.get('webhookUrl') as string) || ''
    const rulesRaw = formData.get('rules') as string | null
    const rules = rulesRaw ? JSON.parse(rulesRaw) : []
    const file = formData.get('file') as File | null

    if (!companyId || !companyName) {
      return Response.json({ error: 'companyId and companyName are required' }, { status: 400 })
    }

    // Save / update company config
    const existingConfig = getCompanyConfig(companyId)
    const config: CompanyConfig = {
      id: companyId,
      name: companyName,
      tagline: existingConfig?.tagline ?? 'Find the perfect rentals',
      primaryColor,
      accentColor,
      navyColor,
      logoText,
      allowedOrigins: existingConfig?.allowedOrigins ?? ['*'],
      cartMode,
      cartInquireUrl,
      webhookUrl,
      rules,
    }
    saveCompanyConfig(config)

    // If a CSV was uploaded, parse and save inventory
    if (file) {
      const text = await file.text()
      const items = parseInventoryCSV(text)
      if (!items.length) {
        return Response.json({ error: 'No items could be parsed from the CSV' }, { status: 400 })
      }
      saveInventory(companyId, items)
      return Response.json({ success: true, itemCount: items.length, config })
    }

    return Response.json({ success: true, config })
  } catch (err) {
    console.error('Upload error:', err)
    return Response.json({ error: 'Upload failed' }, { status: 500 })
  }
}
