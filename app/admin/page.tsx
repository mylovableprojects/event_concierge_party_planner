'use client'

import { useState } from 'react'

interface Rule {
  name: string
  triggers: string
  requiredTags: string
  message: string
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
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SetupResult | null>(null)
  const [error, setError] = useState('')

  const addRule = () => setRules(prev => [...prev, { name: '', triggers: '', requiredTags: '', message: '' }])
  const removeRule = (i: number) => setRules(prev => prev.filter((_, idx) => idx !== i))
  const updateRule = (i: number, field: keyof Rule, value: string) =>
    setRules(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))

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
    if (file) fd.append('file', file)

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
                    Trigger Keywords <span className="font-normal text-gray-400">(comma-separated — detected in customer messages)</span>
                  </label>
                  <input
                    value={rule.triggers}
                    onChange={e => updateRule(i, 'triggers', e.target.value)}
                    placeholder="church, school, corporate, company picnic, municipality"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Required Tags <span className="font-normal text-gray-400">(comma-separated — items must have these tags in your CSV)</span>
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
                    Message to Customer <span className="font-normal text-gray-400">(Claude will mention this naturally)</span>
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

          {/* CSV Upload */}
          <div className="space-y-2">
            <h2 className="font-semibold text-gray-800">
              Inventory CSV <span className="text-gray-400 font-normal text-sm">(optional — skip to update settings only)</span>
            </h2>
            <p className="text-xs text-gray-500">
              Export your inventory as a CSV. We auto-detect columns — no formatting required.
              Columns: <code className="bg-gray-100 px-1 rounded">name, description, price, category, image_url</code> + optional: <code className="bg-gray-100 px-1 rounded">tags, age_min, age_max, capacity</code>.
              Use <code className="bg-gray-100 px-1 rounded">tags</code> to add labels like <code className="bg-gray-100 px-1 rounded">tssa</code> for rule filtering.
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
