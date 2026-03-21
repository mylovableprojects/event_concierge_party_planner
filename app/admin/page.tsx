'use client'

import { useState, useRef } from 'react'

interface Rule {
  name: string
  triggers: string
  requiredTags: string
  message: string
}

interface ParsedItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  tags: string[]
  ageMin: number
  ageMax: number
  guestCapacity: number
  image: string
}

interface SetupResult {
  companyId: string
  companyName: string
  itemCount?: number
}

const DEFAULT_RULES: Rule[] = [
  {
    name: 'TSSA Certified Only',
    triggers: 'church, school, corporate, company picnic, municipality, government, organization, festival, public event',
    requiredTags: 'tssa',
    message: 'For school, church, and corporate events we only show TSSA-certified equipment',
  },
]

type InventoryTab = 'csv' | 'text' | 'photo' | 'manual'

export default function AdminPage() {
  const [companyId, setCompanyId] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#B03A3A')
  const [accentColor, setAccentColor] = useState('#E8A020')
  const [navyColor, setNavyColor] = useState('#1E2B3C')
  const [cartMode, setCartMode] = useState<'enabled' | 'inquire' | 'hidden'>('enabled')
  const [cartInquireUrl, setCartInquireUrl] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [rules, setRules] = useState<Rule[]>([])

  // Inventory input
  const [inventoryTab, setInventoryTab] = useState<InventoryTab>('csv')
  const [file, setFile] = useState<File | null>(null)
  const [aiText, setAiText] = useState('')
  const [aiImage, setAiImage] = useState<{ data: string; mediaType: string; preview: string } | null>(null)
  const [parsedItems, setParsedItems] = useState<ParsedItem[] | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [manualItems, setManualItems] = useState<ParsedItem[]>([])
  const [manualForm, setManualForm] = useState({ name: '', price: '', category: 'Inflatables', description: '', tags: '' })

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SetupResult | null>(null)
  const [error, setError] = useState('')
  const imageInputRef = useRef<HTMLInputElement>(null)

  const addRule = () => setRules(prev => [...prev, { name: '', triggers: '', requiredTags: '', message: '' }])
  const removeRule = (i: number) => setRules(prev => prev.filter((_, idx) => idx !== i))
  const updateRule = (i: number, field: keyof Rule, value: string) =>
    setRules(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const mediaType = dataUrl.match(/data:([^;]+)/)?.[1] || 'image/jpeg'
      const data = dataUrl.split(',')[1]
      setAiImage({ data, mediaType, preview: dataUrl })
      setParsedItems(null)
      setParseError('')
    }
    reader.readAsDataURL(f)
  }

  const parseWithAI = async (mode: 'text' | 'photo') => {
    setParsing(true)
    setParsedItems(null)
    setParseError('')
    try {
      const body = mode === 'text'
        ? { mode: 'text', content: aiText }
        : { mode: 'image', data: aiImage!.data, mediaType: aiImage!.mediaType }
      const res = await fetch('/api/parse-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to parse')
      setParsedItems(data.items)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setParsing(false)
    }
  }

  const addManualItem = () => {
    if (!manualForm.name.trim()) return
    const item: ParsedItem = {
      id: manualForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      name: manualForm.name.trim(),
      description: manualForm.description.trim(),
      price: parseFloat(manualForm.price) || 0,
      category: manualForm.category || 'Other',
      tags: manualForm.tags.split(';').map(t => t.trim()).filter(Boolean),
      ageMin: 1,
      ageMax: 99,
      guestCapacity: 50,
      image: '',
    }
    setManualItems(prev => [...prev, item])
    setManualForm({ name: '', price: '', category: manualForm.category, description: '', tags: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const serializedRules = rules
      .filter(r => r.name && r.triggers && r.requiredTags)
      .map(r => ({
        name: r.name,
        triggers: r.triggers.split(',').map(t => t.trim()).filter(Boolean),
        requiredTags: r.requiredTags.split(',').map(t => t.trim()).filter(Boolean),
        message: r.message,
      }))

    const fd = new FormData()
    fd.append('companyId', companyId.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
    fd.append('companyName', companyName)
    fd.append('primaryColor', primaryColor)
    fd.append('accentColor', accentColor)
    fd.append('navyColor', navyColor)
    fd.append('cartMode', cartMode)
    fd.append('cartInquireUrl', cartInquireUrl)
    fd.append('webhookUrl', webhookUrl)
    fd.append('rules', JSON.stringify(serializedRules))

    if (inventoryTab === 'csv' && file) {
      fd.append('file', file)
    } else if ((inventoryTab === 'text' || inventoryTab === 'photo') && parsedItems?.length) {
      fd.append('items', JSON.stringify(parsedItems))
    } else if (inventoryTab === 'manual' && manualItems.length) {
      fd.append('items', JSON.stringify(manualItems))
    }

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult({ companyId: data.config.id, companyName: data.config.name, itemCount: data.itemCount })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://yourapp.com'
  const embedCode = result
    ? `<script src="${origin}/embed.js" data-company="${result.companyId}"></script>`
    : null

  const TABS: { id: InventoryTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'csv',
      label: 'CSV Upload',
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    },
    {
      id: 'text',
      label: 'Describe / Paste',
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
    },
    {
      id: 'photo',
      label: 'Photo / Image',
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
    },
    {
      id: 'manual',
      label: 'Add Manually',
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    },
  ]

  const itemsForTab = inventoryTab === 'manual' ? manualItems : (parsedItems ?? [])
  const itemCount = inventoryTab === 'csv' ? null : itemsForTab.length

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">

        <div>
          <h1 className="text-3xl font-bold text-gray-900">Event Concierge Setup</h1>
          <p className="text-gray-500 mt-1">Configure your AI chat widget and upload your rental inventory.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-8">

          {/* Company Info */}
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">Company Info</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Bounce Bros Party Rentals"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company ID <span className="text-gray-400 font-normal">(used in embed code, no spaces)</span>
              </label>
              <input
                value={companyId}
                onChange={e => setCompanyId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="bounce-bros"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Brand Colors */}
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">Brand Colors</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Primary (buttons, prices)', value: primaryColor, set: setPrimaryColor },
                { label: 'Accent (user bubbles)', value: accentColor, set: setAccentColor },
                { label: 'Dark (header, cart bar)', value: navyColor, set: setNavyColor },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-gray-600 mb-2">{label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={value}
                      onChange={e => set(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                    />
                    <span className="text-xs font-mono text-gray-500">{value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart Mode */}
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-800">Add to Cart</h2>
            <p className="text-xs text-gray-500">Choose how the widget handles item selection.</p>
            <div className="space-y-2">
              {([
                { value: 'enabled', label: '+ Add to Cart', desc: 'Fires an event your booking software catches. Best if you have API/integration.' },
                { value: 'inquire', label: 'Inquire Button', desc: 'Shows an "Inquire" button that links to your contact or booking page.' },
                { value: 'hidden', label: 'Browse Only', desc: 'No button — customers browse recommendations and contact you separately.' },
              ] as const).map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${cartMode === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <input
                    type="radio"
                    name="cartMode"
                    value={opt.value}
                    checked={cartMode === opt.value}
                    onChange={() => setCartMode(opt.value)}
                    className="mt-0.5 accent-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-800">{opt.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            {cartMode === 'inquire' && (
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Inquiry URL</label>
                <input
                  type="url"
                  value={cartInquireUrl}
                  onChange={e => setCartInquireUrl(e.target.value)}
                  placeholder="https://yourdomain.com/contact"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Rules */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800">Inventory Rules</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Auto-filter inventory based on event type. e.g. only show TSSA-certified items for school/church events.
                </p>
              </div>
              <button
                type="button"
                onClick={addRule}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors"
              >
                + Add Rule
              </button>
            </div>

            {rules.length === 0 && (
              <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-sm text-gray-400">No rules yet.</p>
                <button
                  type="button"
                  onClick={() => setRules(DEFAULT_RULES)}
                  className="text-xs text-blue-500 hover:underline mt-1"
                >
                  Load TSSA example rule
                </button>
              </div>
            )}

            {rules.map((rule, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rule {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeRule(i)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Rule Name</label>
                  <input
                    value={rule.name}
                    onChange={e => updateRule(i, 'name', e.target.value)}
                    placeholder="TSSA Certified Only"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Trigger Keywords <span className="font-normal text-gray-400">(comma-separated)</span>
                  </label>
                  <input
                    value={rule.triggers}
                    onChange={e => updateRule(i, 'triggers', e.target.value)}
                    placeholder="church, school, corporate, company picnic"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Required Tags <span className="font-normal text-gray-400">(comma-separated)</span>
                  </label>
                  <input
                    value={rule.requiredTags}
                    onChange={e => updateRule(i, 'requiredTags', e.target.value)}
                    placeholder="tssa"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Message to Customer
                  </label>
                  <input
                    value={rule.message}
                    onChange={e => updateRule(i, 'message', e.target.value)}
                    placeholder="For school and corporate events we only show TSSA-certified equipment"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* GHL Webhook */}
          <div className="space-y-2">
            <h2 className="font-semibold text-gray-800">Go HighLevel Webhook <span className="text-gray-400 font-normal text-sm">(optional)</span></h2>
            <p className="text-xs text-gray-500">
              When a customer fills out the &quot;Check Availability&quot; form in the widget, we POST their name, phone, event description, and interested items to this URL.
              In GHL: <strong>Workflows → Add Trigger → Inbound Webhook</strong> — copy the webhook URL and paste it here.
            </p>
            <input
              type="url"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://services.leadconnectorhq.com/hooks/..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Inventory — tabbed */}
          <div className="space-y-3">
            <div>
              <h2 className="font-semibold text-gray-800">
                Inventory <span className="text-gray-400 font-normal text-sm">(optional — skip to update settings only)</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Choose how you&apos;d like to add your rental items.</p>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setInventoryTab(tab.id); setParsedItems(null); setParseError('') }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                    inventoryTab === tab.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* CSV tab */}
            {inventoryTab === 'csv' && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">
                  Export your inventory as a CSV. Columns: <code className="bg-gray-100 px-1 rounded">name, description, price, category, image_url</code> + optional: <code className="bg-gray-100 px-1 rounded">tags, age_min, age_max, capacity</code>.
                  Separate multiple tags with a semicolon, e.g. <code className="bg-gray-100 px-1 rounded">tssa;outdoor</code>.
                </p>
                <a
                  href="/inventory-template.csv"
                  download
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download CSV template
                </a>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                />
              </div>
            )}

            {/* AI Text tab */}
            {inventoryTab === 'text' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">
                  Paste a price list, copy text from your website, or just describe your inventory in plain English. Claude will extract the items.
                </p>
                <textarea
                  value={aiText}
                  onChange={e => { setAiText(e.target.value); setParsedItems(null) }}
                  placeholder={`Examples:\n• "15x15 Bounce Castle $199, Water Slide $349, Popcorn Machine $75"\n• Paste your website's rental page text\n• "We have 3 bounce houses from $150–$250, a dunk tank for $275, and tables/chairs for rent"`}
                  rows={6}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-700 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => parseWithAI('text')}
                  disabled={!aiText.trim() || parsing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  {parsing ? (
                    <>
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                      Parsing...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      Parse with AI
                    </>
                  )}
                </button>
                {parseError && <p className="text-xs text-red-600">{parseError}</p>}
                {parsedItems && <ParsedItemsPreview items={parsedItems} onClear={() => setParsedItems(null)} />}
              </div>
            )}

            {/* Photo tab */}
            {inventoryTab === 'photo' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">
                  Upload a photo of your price sheet, brochure, or a screenshot of your website. Claude will read it and extract your inventory.
                </p>
                {!aiImage ? (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 flex flex-col items-center gap-2 text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span className="text-sm font-medium">Click to upload an image</span>
                    <span className="text-xs">JPG, PNG, or WebP</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="relative rounded-xl overflow-hidden border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={aiImage.preview} alt="Uploaded" className="w-full max-h-64 object-contain bg-gray-50" />
                      <button
                        type="button"
                        onClick={() => { setAiImage(null); setParsedItems(null); setParseError(''); if (imageInputRef.current) imageInputRef.current.value = '' }}
                        className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => parseWithAI('photo')}
                      disabled={parsing}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-colors"
                    >
                      {parsing ? (
                        <>
                          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                          Extracting...
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                          Extract with AI
                        </>
                      )}
                    </button>
                  </div>
                )}
                <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="hidden" />
                {parseError && <p className="text-xs text-red-600">{parseError}</p>}
                {parsedItems && <ParsedItemsPreview items={parsedItems} onClear={() => setParsedItems(null)} />}
              </div>
            )}

            {/* Manual tab */}
            {inventoryTab === 'manual' && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500">Add items one at a time. Good for small catalogs or fine-tuning after a bulk import.</p>
                <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <input
                        value={manualForm.name}
                        onChange={e => setManualForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Item name (required)"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        min="0"
                        value={manualForm.price}
                        onChange={e => setManualForm(f => ({ ...f, price: e.target.value }))}
                        placeholder="Price ($)"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <select
                        value={manualForm.category}
                        onChange={e => setManualForm(f => ({ ...f, category: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {['Inflatables', 'Water', 'Concessions', 'Furniture', 'Tents', 'Games', 'Entertainment', 'Toddler', 'Party Supplies', 'Other'].map(c => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        value={manualForm.description}
                        onChange={e => setManualForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Description (optional)"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        value={manualForm.tags}
                        onChange={e => setManualForm(f => ({ ...f, tags: e.target.value }))}
                        placeholder="Tags, semicolon-separated (e.g. tssa;outdoor)"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addManualItem}
                    disabled={!manualForm.name.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add Item
                  </button>
                </div>

                {manualItems.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">{manualItems.length} item{manualItems.length !== 1 ? 's' : ''} added</span>
                      <button type="button" onClick={() => setManualItems([])} className="text-xs text-red-400 hover:text-red-600">Clear all</button>
                    </div>
                    {manualItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-3 py-2.5">
                        <div>
                          <span className="text-sm font-medium text-gray-800">{item.name}</span>
                          <span className="text-xs text-gray-400 ml-2">{item.category}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-700">${item.price}</span>
                          <button type="button" onClick={() => setManualItems(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-400 transition-colors">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Summary badge when items are ready (non-CSV tabs) */}
            {itemCount !== null && itemCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                {itemCount} item{itemCount !== 1 ? 's' : ''} ready to save
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm bg-gray-900 hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving...' : 'Save & Generate Embed Code'}
          </button>
        </form>

        {/* Result */}
        {result && (
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-900">{result.companyName} is set up!</div>
                {result.itemCount && <div className="text-sm text-gray-500">{result.itemCount} inventory items loaded</div>}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Add this to your website before <code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code>:</p>
              <div className="bg-gray-950 rounded-xl px-4 py-3 flex items-start gap-3">
                <code className="text-green-400 text-xs flex-1 break-all">{embedCode}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(embedCode || '')}
                  className="text-gray-400 hover:text-white shrink-0 transition-colors"
                  title="Copy"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <a
                href={`/widget?company=${result.companyId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Preview Widget →
              </a>
              <a
                href={`/?company=${result.companyId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Preview on Demo Page →
              </a>
            </div>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 text-sm text-amber-800">
          <strong>Demo:</strong> Pre-loaded inventory under company ID <code className="bg-amber-100 px-1 rounded">demo</code> with a TSSA rule active.
          Visit <a href="/widget?company=demo" target="_blank" className="underline">/widget?company=demo</a> — try typing &quot;school picnic&quot; to see the rule filter in action.
        </div>

      </div>
    </div>
  )
}

function ParsedItemsPreview({ items, onClear }: { items: ParsedItem[]; onClear: () => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">
          {items.length} item{items.length !== 1 ? 's' : ''} found — review before saving
        </span>
        <button type="button" onClick={onClear} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
          Clear
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-3 py-2.5">
            <div className="min-w-0">
              <span className="text-sm font-medium text-gray-800 truncate block">{item.name}</span>
              <span className="text-xs text-gray-400">{item.category}{item.tags.length > 0 ? ` · ${item.tags.join(', ')}` : ''}</span>
            </div>
            <span className="text-sm font-bold text-gray-700 shrink-0 ml-3">${item.price}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400">These items will be saved when you click &quot;Save &amp; Generate Embed Code&quot;.</p>
    </div>
  )
}
