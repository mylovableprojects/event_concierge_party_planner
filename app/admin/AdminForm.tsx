'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Rule {
  name: string
  triggers: string
  requiredTags: string
  message: string
  pinnedItems: string   // comma-separated item names chosen by admin
}

interface InventoryOption {
  id: string
  name: string
  category: string
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

interface Config {
  id: string
  name: string
  primaryColor: string
  accentColor: string
  navyColor: string
  cartMode: 'enabled' | 'inquire' | 'hidden' | 'quote'
  cartInquireUrl: string
  webhookUrl: string
  customInstructions?: string
  rules: Array<{ name: string; triggers: string[]; requiredTags: string[]; message: string }>
  apiProvider?: 'anthropic' | 'openai'
}

const DEFAULT_RULES: Rule[] = [
  {
    name: 'TSSA Certified Only',
    triggers: 'church, school, corporate, company picnic, municipality, government, organization, festival, public event',
    requiredTags: 'tssa',
    message: 'For school, church, and corporate events we only show TSSA-certified equipment',
    pinnedItems: '',
  },
]

type InventoryTab = 'csv' | 'text' | 'photo' | 'manual'

type AdminSectionId =
  | 'company'
  | 'brandColors'
  | 'cartMode'
  | 'inventoryRules'
  | 'ghlWebhook'
  | 'customAiInstructions'
  | 'aiApiKey'
  | 'leadEmailNotifications'
  | 'integrations'
  | 'inventory'
  | 'leads'

export type { AdminSectionId }

const ADMIN_SECTIONS_STORAGE_KEY = 'adminDashboardSections.v1'

const DEFAULT_SECTION_OPEN: Record<AdminSectionId, boolean> = {
  integrations: true,
  company: false,
  brandColors: false,
  cartMode: false,
  inventoryRules: false,
  ghlWebhook: false,
  customAiInstructions: false,
  aiApiKey: false,
  leadEmailNotifications: false,
  inventory: false,
  leads: false,
}

function AccordionSection(
  {
    sectionId,
    title,
    open,
    onToggle,
    headerRight,
    children,
  }: {
    sectionId: AdminSectionId
    title: string
    open: boolean
    onToggle: () => void
    headerRight?: React.ReactNode
    children: React.ReactNode
  }
) {
  const contentId = `section-${sectionId}`

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
      <div className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left border-b border-gray-200">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={contentId}
          className="flex items-center gap-3 min-w-0 flex-1"
        >
          <div className="min-w-0">
            <div className="font-bold text-gray-900 text-sm sm:text-base truncate">{title}</div>
          </div>
          <span className="text-gray-600 font-semibold text-sm shrink-0" aria-hidden="true">
            {open ? '▼' : '▶'}
          </span>
        </button>

        {headerRight && (
          <div className="flex items-center gap-3 shrink-0 text-gray-600">
            {headerRight}
          </div>
        )}
      </div>

      <div
        id={contentId}
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <div className={`px-5 py-4 ${open ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminForm(
  {
    config,
    maskedApiKey,
    maskedResendKey,
    inventoryCount,
    visibleSections,
    embedded = false,
    showHeader = true,
    headerTitle = 'Widget Settings',
    headerSubtitle = 'Configure your AI chat widget and manage your rental inventory.',
    showUpsellBanner = true,
    showSetupChecklist = true,
    showLeadsPanel = true,
    showFooter = true,
    showSaveAndEmbed = true,
  }: {
    config: Config
    maskedApiKey?: string
    maskedResendKey?: string
    inventoryCount?: number
    visibleSections?: AdminSectionId[]
    embedded?: boolean
    showHeader?: boolean
    headerTitle?: string
    headerSubtitle?: string
    showUpsellBanner?: boolean
    showSetupChecklist?: boolean
    showLeadsPanel?: boolean
    showFooter?: boolean
    showSaveAndEmbed?: boolean
  }
) {
  const router = useRouter()
  const companyId = config.id
  const [companyName, setCompanyName] = useState(config.name)
  const [primaryColor, setPrimaryColor] = useState(config.primaryColor)
  const [accentColor, setAccentColor] = useState(config.accentColor)
  const [navyColor, setNavyColor] = useState(config.navyColor)
  const [cartMode, setCartMode] = useState<'enabled' | 'inquire' | 'hidden' | 'quote'>(config.cartMode)
  const [cartInquireUrl, setCartInquireUrl] = useState(config.cartInquireUrl)
  const [webhookUrl, setWebhookUrl] = useState(config.webhookUrl)
  const [customInstructions, setCustomInstructions] = useState(config.customInstructions || '')
  const [rules, setRules] = useState<Rule[]>(
    config.rules.map(r => ({
      name: r.name,
      triggers: r.triggers.join(', '),
      requiredTags: r.requiredTags.join(', '),
      message: r.message,
      pinnedItems: (r as { pinnedItemIds?: string[] }).pinnedItemIds?.join(', ') ?? '',
    }))
  )

  // Inventory options for the rule item picker
  const [inventoryOptions, setInventoryOptions] = useState<InventoryOption[]>([])
  useEffect(() => {
    fetch('/api/inventory')
      .then(r => r.json())
      .then(data => {
        const items = data.inventory ?? data.items ?? []
        setInventoryOptions(items.map((item: { id: string; name: string; category: string }) => ({
          id: item.id,
          name: item.name,
          category: item.category,
        })))
      })
      .catch(() => {/* non-critical */})
  }, [])

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

  // API key section (Anthropic only)
  const apiProvider: 'anthropic' = 'anthropic'
  const [newApiKey, setNewApiKey] = useState('')
  const [apiKeyTesting, setApiKeyTesting] = useState(false)
  const [apiKeyTestResult, setApiKeyTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [apiKeySaving, setApiKeySaving] = useState(false)
  const [apiKeyError, setApiKeyError] = useState('')
  const [apiKeySuccess, setApiKeySuccess] = useState(false)

  // Resend key section
  const [newResendKey, setNewResendKey] = useState('')
  const [resendTesting, setResendTesting] = useState(false)
  const [resendTestResult, setResendTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [resendSaving, setResendSaving] = useState(false)
  const [resendError, setResendError] = useState('')
  const [resendSuccess, setResendSuccess] = useState(false)

  // Integrations — InflatableOffice (Redis-backed)
  const [ioStatusLoading, setIoStatusLoading] = useState(true)
  const [ioConnected, setIoConnected] = useState(false)
  const [ioLastSyncedAt, setIoLastSyncedAt] = useState<string | null>(null)
  const [ioItemCount, setIoItemCount] = useState<number | null>(null)
  const [ioApiKey, setIoApiKey] = useState('')
  const [ioConnecting, setIoConnecting] = useState(false)
  const [ioResyncing, setIoResyncing] = useState(false)
  const [ioDisconnecting, setIoDisconnecting] = useState(false)
  const [ioError, setIoError] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  const [openSections, setOpenSections] = useState<Record<AdminSectionId, boolean>>(() => {
    if (typeof window === 'undefined') return DEFAULT_SECTION_OPEN
    try {
      const raw = window.localStorage.getItem(ADMIN_SECTIONS_STORAGE_KEY)
      if (!raw) return DEFAULT_SECTION_OPEN
      const parsed = JSON.parse(raw) as Partial<Record<AdminSectionId, boolean>>
      return { ...DEFAULT_SECTION_OPEN, ...parsed }
    } catch {
      return DEFAULT_SECTION_OPEN
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(ADMIN_SECTIONS_STORAGE_KEY, JSON.stringify(openSections))
    } catch {
      // ignore
    }
  }, [openSections])

  const toggleSection = (id: AdminSectionId) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SetupResult | null>(null)
  const [error, setError] = useState('')
  const imageInputRef = useRef<HTMLInputElement>(null)

  const addRule = () => setRules(prev => [...prev, { name: '', triggers: '', requiredTags: '', message: '', pinnedItems: '' }])
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
      .filter(r => r.name && r.triggers)
      .map(r => {
        // Match pinned item names back to IDs
        const pinnedNames = r.pinnedItems.split(',').map(s => s.trim()).filter(Boolean)
        const pinnedItemIds = pinnedNames.length > 0
          ? inventoryOptions
              .filter(opt => pinnedNames.some(n => n.toLowerCase() === opt.name.toLowerCase()))
              .map(opt => opt.id)
          : []
        return {
          name: r.name,
          triggers: r.triggers.split(',').map(t => t.trim()).filter(Boolean),
          requiredTags: r.requiredTags.split(',').map(t => t.trim()).filter(Boolean),
          message: r.message,
          ...(pinnedItemIds.length > 0 ? { pinnedItemIds } : {}),
        }
      })

    const fd = new FormData()
    fd.append('companyId', companyId)
    fd.append('companyName', companyName)
    fd.append('primaryColor', primaryColor)
    fd.append('accentColor', accentColor)
    fd.append('navyColor', navyColor)
    fd.append('cartMode', cartMode)
    fd.append('cartInquireUrl', cartInquireUrl)
    fd.append('webhookUrl', webhookUrl)
    fd.append('customInstructions', customInstructions)
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

  const testApiKey = async () => {
    if (!newApiKey.trim()) return
    setApiKeyTesting(true)
    setApiKeyTestResult(null)
    try {
      const res = await fetch('/api/test-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: newApiKey }),
      })
      const data = await res.json()
      setApiKeyTestResult(data.valid ? { ok: true, msg: 'Key is valid!' } : { ok: false, msg: data.error })
    } catch {
      setApiKeyTestResult({ ok: false, msg: 'Could not reach validation endpoint' })
    } finally {
      setApiKeyTesting(false)
    }
  }

  const saveApiKey = async () => {
    if (!newApiKey.trim()) return
    setApiKeySaving(true)
    setApiKeyError('')
    setApiKeySuccess(false)
    try {
      console.log('[ai-key-ui] save POST anthropic apiKeyLen=', newApiKey.length)
      const res = await fetch('/api/update-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: newApiKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setApiKeySuccess(true)
      setNewApiKey('')
      setApiKeyTestResult(null)
      showToast({ type: 'success', message: 'AI API key saved.' })
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setApiKeyError(msg)
      showToast({ type: 'error', message: msg })
    } finally {
      setApiKeySaving(false)
    }
  }

  const testResendKey = async () => {
    if (!newResendKey.trim()) return
    setResendTesting(true)
    setResendTestResult(null)
    try {
      const res = await fetch('/api/test-resend-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: newResendKey }),
      })
      const data = await res.json()
      setResendTestResult(data.valid ? { ok: true, msg: 'Key is valid!' } : { ok: false, msg: data.error })
    } catch {
      setResendTestResult({ ok: false, msg: 'Could not reach validation endpoint' })
    } finally {
      setResendTesting(false)
    }
  }

  const saveResendKey = async () => {
    if (!newResendKey.trim()) return
    setResendSaving(true)
    setResendError('')
    setResendSuccess(false)
    try {
      const res = await fetch('/api/update-resend-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: newResendKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setResendSuccess(true)
      setNewResendKey('')
      setResendTestResult(null)
    } catch (err) {
      setResendError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setResendSaving(false)
    }
  }

  const connectInflatableOffice = async () => {
    if (!ioApiKey.trim()) return
    setIoConnecting(true)
    setIoError('')
    try {
      console.log('[io-ui] connect POST businessId=', companyId)
      const res = await fetch('/api/admin/io/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: ioApiKey, businessId: companyId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to connect')
      setIoApiKey('')
      showToast({ type: 'success', message: 'InflatableOffice connected and synced.' })
      await loadIoStatus()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setIoError(msg)
      showToast({ type: 'error', message: msg })
    } finally {
      setIoConnecting(false)
    }
  }

  const resyncInflatableOffice = async () => {
    setIoResyncing(true)
    setIoError('')
    try {
      console.log('[io-ui] sync POST businessId=', companyId)
      const res = await fetch('/api/admin/io/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: companyId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to re-sync')
      showToast({ type: 'success', message: 'InflatableOffice re-sync complete.' })
      await loadIoStatus()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setIoError(msg)
      showToast({ type: 'error', message: msg })
    } finally {
      setIoResyncing(false)
    }
  }

  const disconnectInflatableOffice = async () => {
    setIoDisconnecting(true)
    setIoError('')
    try {
      console.log('[io-ui] disconnect POST businessId=', companyId)
      const res = await fetch('/api/admin/io/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: companyId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to disconnect')
      showToast({ type: 'success', message: 'InflatableOffice disconnected.' })
      await loadIoStatus()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setIoError(msg)
      showToast({ type: 'error', message: msg })
    } finally {
      setIoDisconnecting(false)
    }
  }

  const showToast = (next: { type: 'success' | 'error'; message: string }, durationMs = 4500) => {
    setToast(next)
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(null), durationMs)
  }

  const loadIoStatus = async () => {
    setIoStatusLoading(true)
    try {
      console.log('[io-ui] status GET businessId=', companyId)
      const res = await fetch(`/api/admin/io/status?businessId=${encodeURIComponent(companyId)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load status')
      setIoConnected(!!data.connected)
      setIoLastSyncedAt(data.lastSynced ?? null)
      setIoItemCount(typeof data.itemCount === 'number' ? data.itemCount : Number(data.itemCount) || 0)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load InflatableOffice status'
      setIoError(msg)
      setIoConnected(false)
      setIoLastSyncedAt(null)
      setIoItemCount(null)
    } finally {
      setIoStatusLoading(false)
    }
  }

  useEffect(() => {
    loadIoStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/login')
  }

  const visible = visibleSections ? new Set<AdminSectionId>(visibleSections) : null
  const show = (id: AdminSectionId) => (visible ? visible.has(id) : true)

  return (
    <div className={embedded ? 'space-y-8' : 'min-h-screen bg-gray-50 py-12 px-4'}>
      <div className={embedded ? 'space-y-8' : 'max-w-2xl mx-auto space-y-8'}>
        {toast && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[min(520px,calc(100vw-2rem))]">
            <div className={`rounded-2xl shadow-lg border px-4 py-3 flex items-start gap-3 ${
              toast.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="mt-0.5">
                {toast.type === 'success' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                )}
              </div>
              <div className="text-sm font-medium flex-1">{toast.message}</div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Dismiss notification"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {showHeader && (
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{headerTitle}</h1>
              <p className="text-gray-500 mt-1">{headerSubtitle}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Log out
            </button>
          </div>
        )}

        {/* Done-for-you upsell banner */}
        {showUpsellBanner && (
          <div className="bg-[#1E2B3C] rounded-2xl p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-white text-sm">Want us to set everything up for you?</p>
              <p className="text-blue-200 text-xs mt-0.5">We&apos;ll configure your widget, load your inventory, and get you live.</p>
            </div>
            <a
              href="mailto:hello@rentalconciergeai.com?subject=Setup%20Help%20Request"
              className="shrink-0 bg-[#E8A020] hover:bg-[#d4911c] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
            >
              Email Us
            </a>
          </div>
        )}

        {/* Setup checklist banner — shown until all steps complete */}
        {showSetupChecklist && (!maskedApiKey || !(inventoryCount ?? 0)) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" className="shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span className="font-semibold text-amber-800 text-sm">Finish setting up your widget</span>
            </div>
            <div className="space-y-2">
              {[
                { done: true,             label: 'Account created' },
                { done: !!maskedApiKey,   label: 'Add your AI API key',          note: 'Required — powers the chat recommendations' },
                { done: (inventoryCount ?? 0) > 0, label: 'Upload your inventory', note: 'So the AI knows what you offer' },
                { done: !!maskedResendKey, label: 'Add Resend key for lead emails', note: 'Optional but recommended' },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${step.done ? 'bg-green-500 border-green-500' : 'border-amber-400'}`}>
                    {step.done && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                  </div>
                  <div>
                    <span className={`text-sm ${step.done ? 'text-gray-400 line-through' : 'text-amber-900 font-medium'}`}>{step.label}</span>
                    {step.note && !step.done && <span className="text-xs text-amber-700 ml-1.5">— {step.note}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-8">

          {/* Company Info */}
          {show('company') && (
          <AccordionSection
            sectionId="company"
            title="Company Info"
            open={!!openSections.company}
            onToggle={() => toggleSection('company')}
          >
            <div className="space-y-4">
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
                  Company ID <span className="text-gray-400 font-normal">(fixed — used in your embed code)</span>
                </label>
                <input
                  value={companyId}
                  readOnly
                  className="w-full border border-gray-100 bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-mono text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>
          </AccordionSection>
          )}

          {/* Brand Colors */}
          {show('brandColors') && (
          <AccordionSection
            sectionId="brandColors"
            title="Brand Colors"
            open={!!openSections.brandColors}
            onToggle={() => toggleSection('brandColors')}
          >
            <div className="space-y-4">
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
          </AccordionSection>
          )}

          {/* Cart Mode */}
          {show('cartMode') && (
          <AccordionSection
            sectionId="cartMode"
            title="Add to Cart"
            open={!!openSections.cartMode}
            onToggle={() => toggleSection('cartMode')}
            headerRight={(
              <InfoPopover>
                <p className="font-semibold text-gray-800">Which mode is right for me?</p>
                <p><strong>+ Add to Cart</strong> — Best if you use InflatableOffice, HireHop, or any booking software that supports JavaScript events. Requires a developer to connect it.</p>
                <p><strong>Inquire Button</strong> — Simplest option. No coding needed. Just paste your contact or booking page URL and every item card gets an &quot;Inquire&quot; button that sends customers there.</p>
                <p><strong>Browse Only</strong> — No buttons at all. Customers browse AI recommendations, then call or email you. Great if you want to keep things simple.</p>
                <p><strong>Quote List</strong> — Customers build a list of items they&apos;re interested in. The full list is sent with their lead form — perfect if you do custom quotes.</p>
              </InfoPopover>
            )}
          >
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Choose how the widget handles item selection.</p>
              <div className="space-y-2">
              {([
                { value: 'enabled', label: '+ Add to Cart', desc: 'Fires an event your booking software catches. Best if you have API/integration.' },
                { value: 'inquire', label: 'Inquire Button', desc: 'Shows an "Inquire" button that links to your contact or booking page.' },
                { value: 'hidden', label: 'Browse Only', desc: 'No button — customers browse recommendations and contact you separately.' },
                { value: 'quote', label: 'Quote List', desc: 'Customers build a quote list inside the widget. The full list is sent with their lead form.' },
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
          </AccordionSection>
          )}

          {/* Rules */}
          {show('inventoryRules') && (
          <AccordionSection
            sectionId="inventoryRules"
            title="Inventory Rules"
            open={!!openSections.inventoryRules}
            onToggle={() => toggleSection('inventoryRules')}
            headerRight={(
              <InfoPopover>
                <p className="font-semibold text-gray-800">What are rules?</p>
                <p>Rules automatically filter your inventory based on keywords in the customer&apos;s conversation.</p>
                <p><strong>Example:</strong> If a customer mentions &quot;school&quot; or &quot;church&quot;, show only items tagged <code className="bg-gray-100 px-1 rounded">tssa</code> (TSSA-certified equipment required for public events).</p>
                <p><strong>Trigger Keywords</strong> — words that activate the rule (e.g. school, church, corporate).</p>
                <p><strong>Required Tags</strong> — only inventory items with these tags will be shown when the rule triggers.</p>
                <p>Tag your inventory items in the CSV using the <code className="bg-gray-100 px-1 rounded">tags</code> column, separated by semicolons.</p>
              </InfoPopover>
            )}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-500">
                    Auto-filter inventory based on event type. e.g. only show TSSA-certified items for school/church events.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addRule}
                  className="shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors"
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
                      When customer mentions <span className="font-normal text-gray-400">(comma-separated words)</span>
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
                      Only show items labelled <span className="font-normal text-gray-400">(comma-separated item labels — ignored if you pick specific items below)</span>
                    </label>
                    <input
                      value={rule.requiredTags}
                      onChange={e => updateRule(i, 'requiredTags', e.target.value)}
                      placeholder="tssa"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Pinned items picker */}
                  <div className="border border-blue-100 bg-blue-50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-blue-800">
                        Or: show only these specific items
                        <span className="font-normal text-blue-600 ml-1">(overrides label filter above)</span>
                      </label>
                      {rule.pinnedItems && (
                        <button type="button" onClick={() => updateRule(i, 'pinnedItems', '')} className="text-xs text-blue-500 hover:text-red-500">
                          Clear
                        </button>
                      )}
                    </div>
                    {inventoryOptions.length > 0 ? (
                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                        {inventoryOptions.map(opt => {
                          const selected = rule.pinnedItems.split(',').map(s => s.trim().toLowerCase()).includes(opt.name.toLowerCase())
                          return (
                            <label key={opt.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${selected ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-blue-100'}`}>
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={selected}
                                onChange={() => {
                                  const current = rule.pinnedItems.split(',').map(s => s.trim()).filter(Boolean)
                                  const next = selected
                                    ? current.filter(n => n.toLowerCase() !== opt.name.toLowerCase())
                                    : [...current, opt.name]
                                  updateRule(i, 'pinnedItems', next.join(', '))
                                }}
                              />
                              <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${selected ? 'bg-white border-white' : 'border-gray-300'}`}>
                                {selected && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>}
                              </span>
                              <span className="truncate font-medium">{opt.name}</span>
                              <span className={`ml-auto shrink-0 ${selected ? 'text-blue-200' : 'text-gray-400'}`}>{opt.category}</span>
                            </label>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-blue-600">Upload your inventory first to pick specific items here.</p>
                    )}
                    {rule.pinnedItems && (
                      <p className="text-xs text-blue-700 font-medium">
                        Showing: {rule.pinnedItems}
                      </p>
                    )}
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
          </AccordionSection>
          )}

          {/* GHL Webhook */}
          {show('ghlWebhook') && (
          <AccordionSection
            sectionId="ghlWebhook"
            title="Go HighLevel Webhook (optional)"
            open={!!openSections.ghlWebhook}
            onToggle={() => toggleSection('ghlWebhook')}
            headerRight={(
              <InfoPopover>
                <p className="font-semibold text-gray-800">How to get your GHL webhook URL</p>
                <ol className="list-decimal list-inside space-y-1.5 text-xs">
                  <li>In GHL, go to <strong>Automation → Workflows</strong></li>
                  <li>Click <strong>+ New Workflow → Start from Scratch</strong></li>
                  <li>Add a trigger: <strong>Inbound Webhook</strong></li>
                  <li>Copy the webhook URL shown</li>
                  <li>Paste it in the field below and click Save</li>
                </ol>
                <p className="text-xs mt-1">The widget will send: name, phone, email, event date, event description, and interested items.</p>
              </InfoPopover>
            )}
          >
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                When a customer fills out the &quot;Check Availability&quot; form, we automatically send their name, phone, event description, and interested items to this URL. Great for triggering automations in Go HighLevel.
              </p>
              <input
                type="url"
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                placeholder="https://services.leadconnectorhq.com/hooks/..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </AccordionSection>
          )}

          {/* Custom AI Instructions */}
          {show('customAiInstructions') && (
          <AccordionSection
            sectionId="customAiInstructions"
            title="Custom AI Instructions (optional)"
            open={!!openSections.customAiInstructions}
            onToggle={() => toggleSection('customAiInstructions')}
            headerRight={(
              <InfoPopover>
                <p className="font-semibold text-gray-800">What to put here</p>
                <p>Anything you want the AI to always know or say. Examples:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Contact info: <em>&quot;If anyone asks to speak to someone or needs help, tell them to call or text 519-560-7701.&quot;</em></li>
                  <li>Service area: <em>&quot;We deliver within 50km of Kitchener, ON only.&quot;</em></li>
                  <li>Hours: <em>&quot;Our office is open Mon–Sat 9am–5pm.&quot;</em></li>
                  <li>Deposits: <em>&quot;All bookings require a 25% deposit to hold the date.&quot;</em></li>
                  <li>Policies: <em>&quot;We do not rent water slides in October or November.&quot;</em></li>
                </ul>
                <p className="text-xs text-gray-500 mt-1">The AI will follow these instructions in every conversation.</p>
              </InfoPopover>
            )}
          >
            <textarea
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value)}
              placeholder={"If anyone asks to speak to someone or needs help, tell them to call or text 519-560-7701.\nWe deliver within 50km of Kitchener, ON.\nAll bookings require a 25% deposit."}
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-700 placeholder:text-gray-400"
            />
          </AccordionSection>
          )}

          {/* API Key */}
          {show('aiApiKey') && (
          <AccordionSection
            sectionId="aiApiKey"
            title="AI API Key"
            open={!!openSections.aiApiKey}
            onToggle={() => toggleSection('aiApiKey')}
            headerRight={(
              <InfoPopover>
                <p className="font-semibold text-gray-800">How to get your API key</p>
                <p><strong>Anthropic (Claude):</strong></p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Go to <strong>console.anthropic.com</strong></li>
                  <li>Sign in or create a free account</li>
                  <li>Click <strong>API Keys → Create Key</strong></li>
                  <li>Copy the key (starts with <code className="bg-gray-100 px-1 rounded">sk-ant-</code>)</li>
                </ol>
                <p className="text-xs mt-1 text-gray-500">Your key is securely encrypted and never visible to anyone, including us.</p>
              </InfoPopover>
            )}
          >
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Your key is securely encrypted and never visible to anyone, including us.
              </p>

            {maskedApiKey && (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 shrink-0">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <span className="text-xs font-mono text-gray-600">Current key: {maskedApiKey}</span>
                <span className="ml-auto text-xs text-gray-400">Anthropic</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anthropic API Key
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={newApiKey}
                  onChange={e => { setNewApiKey(e.target.value); setApiKeyTestResult(null); setApiKeySuccess(false) }}
                  placeholder="sk-ant-..."
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={testApiKey}
                  disabled={!newApiKey.trim() || apiKeyTesting}
                  className="shrink-0 px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors whitespace-nowrap"
                >
                  {apiKeyTesting ? 'Testing...' : 'Test Key'}
                </button>
              </div>
              {apiKeyTestResult && (
                <p className={`mt-1.5 text-xs font-medium ${apiKeyTestResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {apiKeyTestResult.ok ? '✓ ' : '✗ '}{apiKeyTestResult.msg}
                </p>
              )}
            </div>

            {apiKeyError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{apiKeyError}</div>
            )}
            {apiKeySuccess && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                API key updated successfully.
              </div>
            )}

            <button
              type="button"
              onClick={saveApiKey}
              disabled={!newApiKey.trim() || apiKeySaving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              {apiKeySaving ? 'Saving...' : 'Save New Key'}
            </button>
            </div>
          </AccordionSection>
          )}

          {/* Resend Email Key */}
          {show('leadEmailNotifications') && (
          <AccordionSection
            sectionId="leadEmailNotifications"
            title="Lead Email Notifications"
            open={!!openSections.leadEmailNotifications}
            onToggle={() => toggleSection('leadEmailNotifications')}
            headerRight={(
              <InfoPopover>
                <p className="font-semibold text-gray-800">How to get your Resend API key</p>
                <ol className="list-decimal list-inside space-y-1.5 text-xs">
                  <li>Go to <strong>resend.com</strong> and create a free account</li>
                  <li>From the dashboard, click <strong>API Keys → Create API Key</strong></li>
                  <li>Give it a name (e.g. &quot;Event Concierge&quot;)</li>
                  <li>Copy the key (starts with <code className="bg-gray-100 px-1 rounded">re_</code>)</li>
                  <li>Paste it below and click Save</li>
                </ol>
                <p className="text-xs mt-1 text-gray-500">Free tier includes 3,000 emails/month. Lead notifications go to your signup email address.</p>
              </InfoPopover>
            )}
          >
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Get emailed instantly when a customer submits the lead form. Uses your own Resend account — get a free key at resend.com.
              </p>

            {maskedResendKey ? (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500 shrink-0">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span className="text-xs font-mono text-gray-600">Resend key: {maskedResendKey}</span>
                <span className="ml-auto text-xs text-green-600 font-medium">Active</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" className="shrink-0">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span className="text-xs text-amber-700">No Resend key set — leads are saved locally but no email notifications will be sent.</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resend API Key</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={newResendKey}
                  onChange={e => { setNewResendKey(e.target.value); setResendTestResult(null); setResendSuccess(false) }}
                  placeholder="re_..."
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={testResendKey}
                  disabled={!newResendKey.trim() || resendTesting}
                  className="shrink-0 px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors whitespace-nowrap"
                >
                  {resendTesting ? 'Testing...' : 'Test Key'}
                </button>
              </div>
              {resendTestResult && (
                <p className={`mt-1.5 text-xs font-medium ${resendTestResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {resendTestResult.ok ? '✓ ' : '✗ '}{resendTestResult.msg}
                </p>
              )}
            </div>

            {resendError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{resendError}</div>
            )}
            {resendSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                Resend key saved. You&apos;ll now receive lead emails.
              </div>
            )}

            <button
              type="button"
              onClick={saveResendKey}
              disabled={!newResendKey.trim() || resendSaving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              {resendSaving ? 'Saving...' : 'Save Resend Key'}
            </button>
            </div>
          </AccordionSection>
          )}

          {/* Integrations */}
          {show('integrations') && (
          <AccordionSection
            sectionId="integrations"
            title="Integrations"
            open={!!openSections.integrations}
            onToggle={() => toggleSection('integrations')}
          >
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Connect your booking software to keep inventory and pricing in sync.</p>

              <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 11a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>
                      <path d="M14 7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"/>
                      <path d="M14 15a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"/>
                      <path d="M10 12h4"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">InflatableOffice</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        ioConnected ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {ioConnected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {ioConnected
                        ? (ioStatusLoading ? 'Checking status…' : `Synced items: ${ioItemCount ?? 0}`)
                        : 'Paste your IO API key to connect and sync.'}
                    </div>
                  </div>
                </div>

                {ioConnected && (
                  <button
                    type="button"
                    onClick={disconnectInflatableOffice}
                    disabled={ioDisconnecting}
                    className="shrink-0 text-xs font-semibold text-red-600 hover:text-red-700 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 disabled:opacity-40 transition-colors"
                  >
                    {ioDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                  <div className="text-xs text-gray-400">Connection status</div>
                  <div className="text-sm font-semibold text-gray-800 mt-0.5">{ioConnected ? 'Connected' : 'Not Connected'}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                  <div className="text-xs text-gray-400">Last synced</div>
                  <div className="text-sm font-semibold text-gray-800 mt-0.5">
                    {ioLastSyncedAt ? new Date(ioLastSyncedAt).toLocaleString() : '—'}
                  </div>
                </div>
              </div>

              {!ioConnected ? (
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">InflatableOffice API Key</label>
                    <input
                      type="password"
                      value={ioApiKey}
                      onChange={e => { setIoApiKey(e.target.value); setIoError('') }}
                      placeholder="Paste your IO API key"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {ioError && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{ioError}</div>}
                  <button
                    type="button"
                    onClick={connectInflatableOffice}
                    disabled={!ioApiKey.trim() || ioConnecting}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-40 transition-colors"
                  >
                    {ioConnecting ? 'Connecting...' : 'Connect & Sync'}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  {ioError && <div className="w-full bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{ioError}</div>}
                  <button
                    type="button"
                    onClick={resyncInflatableOffice}
                    disabled={ioResyncing}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-extrabold hover:bg-blue-700 disabled:opacity-40 transition-colors shadow-sm"
                  >
                    {ioResyncing ? 'Re-syncing...' : 'Re-sync Now'}
                  </button>
                </div>
              )}
            </div>
            </div>
          </AccordionSection>
          )}

          {/* Inventory — tabbed */}
          {show('inventory') && (
          <AccordionSection
            sectionId="inventory"
            title="Inventory"
            open={!!openSections.inventory}
            onToggle={() => toggleSection('inventory')}
          >
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Choose how you&apos;d like to add your rental items. <span className="text-gray-400">(optional — skip to update settings only)</span>
              </p>
              <p className="text-xs text-gray-500">
                Using InflatableOffice? Set your IO API key under <a className="font-semibold underline underline-offset-2 hover:text-gray-700" href="/admin/integrations">Integrations</a>, then come back here and click <span className="font-semibold">Re-sync Now</span>.
              </p>

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
          </AccordionSection>
          )}

          {/* Inventory Editor */}
          {show('inventory') && <InventoryEditor />}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {showSaveAndEmbed && (
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm bg-gray-900 hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : 'Save & Generate Embed Code'}
            </button>
          )}
        </form>

        {/* Sticky save bar — always visible while scrolling */}
        {showSaveAndEmbed && (
          <div className="fixed bottom-0 left-0 right-0 md:left-[250px] z-30 bg-white border-t border-gray-200 shadow-lg px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-500 hidden sm:block">Remember to save your changes.</p>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                const form = document.querySelector('form')
                if (form) form.requestSubmit()
              }}
              className="ml-auto px-6 py-2.5 rounded-xl text-white font-semibold text-sm bg-gray-900 hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Result */}
        {showSaveAndEmbed && result && (
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
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-700">Add this to your website before <code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code>:</p>
                <InfoPopover>
                  <p className="font-semibold text-gray-800">Where to paste this code</p>
                  <p><strong>WordPress:</strong> Appearance → Theme Editor → footer.php, paste before <code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code>. Or use a plugin like &quot;Insert Headers and Footers&quot;.</p>
                  <p><strong>Wix:</strong> Settings → Custom Code → Add Code → Body (end of page).</p>
                  <p><strong>Squarespace:</strong> Settings → Advanced → Code Injection → Footer.</p>
                  <p><strong>Webflow:</strong> Project Settings → Custom Code → Footer Code.</p>
                  <p><strong>GHL Funnel/Website:</strong> Edit page → Settings → Tracking Code → Body Tracking Code.</p>
                </InfoPopover>
              </div>
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

        {/* Leads Panel */}
        {showLeadsPanel && show('leads') && (
          <AccordionSection
            sectionId="leads"
            title="Leads"
            open={!!openSections.leads}
            onToggle={() => toggleSection('leads')}
          >
            <LeadsPanel />
          </AccordionSection>
        )}

        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 text-sm text-amber-800">
          <strong>Demo:</strong> Pre-loaded inventory under company ID <code className="bg-amber-100 px-1 rounded">demo</code> with a TSSA rule active.
          Visit <a href="/widget?company=demo" target="_blank" className="underline">/widget?company=demo</a> — try typing &quot;school picnic&quot; to see the rule filter in action.
        </div>

        {/* Support footer */}
        {showFooter && (
          <div className="border-t border-gray-100 pt-6 text-center text-sm text-gray-400">
            Need help?{' '}
            <a href="mailto:hello@thepartyrentaltoolkit.com" className="text-[#B03A3A] hover:underline font-medium">
              hello@thepartyrentaltoolkit.com
            </a>
            <span className="mx-2">·</span>
            Event Concierge is a product of{' '}
            <a href="https://thepartyrentaltoolkit.com" target="_blank" rel="noopener noreferrer" className="text-[#1E2B3C] hover:underline font-medium">
              The Party Rental Toolkit
            </a>
          </div>
        )}

      </div>
    </div>
  )
}

const CATEGORIES = ['Inflatables', 'Water', 'Concessions', 'Furniture', 'Tents', 'Games', 'Entertainment', 'Toddler', 'Party Supplies', 'Other']

interface EditableItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  tags: string       // semicolon-separated for editing
  ageMin: number
  ageMax: number
  guestCapacity: number
  image: string
  url?: string
  source?: string
  sourceId?: string | number
}

function InventoryEditor() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<EditableItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/inventory')
      const data = await res.json()
      setItems((data.inventory || []).map((item: EditableItem & { tags: string[] }) => ({
        ...item,
        tags: Array.isArray(item.tags) ? item.tags.join('; ') : (item.tags || ''),
      })))
      setDirty(false)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const toggle = () => {
    if (!open) load()
    setOpen(o => !o)
  }

  const update = (id: string, field: keyof EditableItem, value: string | number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
    setDirty(true)
    setSaveMsg('')
  }

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
    setDirty(true)
    setSaveMsg('')
    if (expandedId === id) setExpandedId(null)
  }

  const addItem = () => {
    const newId = `item-${Date.now()}`
    setItems(prev => [...prev, {
      id: newId, name: '', description: '', price: 0,
      category: 'Other', tags: '', ageMin: 1, ageMax: 99,
      guestCapacity: 50, image: '', url: '',
    }])
    setExpandedId(newId)
    setDirty(true)
  }

  const save = async () => {
    setSaving(true)
    setSaveMsg('')
    try {
      const payload = items.map(item => ({
        ...item,
        price: Number(item.price) || 0,
        ageMin: Number(item.ageMin) || 1,
        ageMax: Number(item.ageMax) || 99,
        guestCapacity: Number(item.guestCapacity) || 50,
        tags: item.tags.split(';').map((t: string) => t.trim()).filter(Boolean),
        url: item.url || undefined,
      }))
      const res = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory: payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSaveMsg(`Saved ${data.itemCount} items`)
      setDirty(false)
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div>
          <span className="font-semibold text-gray-800 text-sm">Edit Existing Inventory</span>
          <span className="text-xs text-gray-500 ml-2">Edit, add tags, update prices, or delete items</span>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="p-4 space-y-3">
          {loading && <p className="text-sm text-gray-400 text-center py-4">Loading inventory...</p>}

          {!loading && items.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No inventory yet. Upload a CSV or add items manually above.</p>
          )}

          {!loading && items.length > 0 && (
            <div className="space-y-1.5">
              {items.map(item => (
                <div key={item.id} className="border border-gray-100 rounded-xl overflow-hidden">
                  {/* Row header */}
                  <div
                    className="flex items-center gap-3 px-3 py-2.5 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className={`text-gray-300 shrink-0 transition-transform ${expandedId === item.id ? 'rotate-90' : ''}`}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-gray-800 truncate block min-w-0">
                          {item.name || <span className="text-gray-400 italic">Untitled item</span>}
                        </span>
                        {item.source === 'inflatable_office' && (
                          <span className="shrink-0 text-[10px] font-extrabold tracking-wide px-1.5 py-0.5 rounded-md border border-blue-200 bg-blue-50 text-blue-700">
                            IO
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {item.category}
                        {item.tags ? ` · ${item.tags}` : ''}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-gray-700 shrink-0">${item.price}</span>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); deleteItem(item.id) }}
                      className="text-gray-300 hover:text-red-400 transition-colors shrink-0 p-1"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                      </svg>
                    </button>
                  </div>

                  {/* Expanded edit fields */}
                  {expandedId === item.id && (
                    <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-100 grid grid-cols-2 gap-3">
                      {item.source === 'inflatable_office' && (
                        <div className="col-span-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-800">
                          <strong>Synced from InflatableOffice</strong> — edit in IO dashboard, then click <strong>Re-sync Now</strong>.
                        </div>
                      )}
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                        <input
                          value={item.name}
                          onChange={e => update(item.id, 'name', e.target.value)}
                          disabled={item.source === 'inflatable_office'}
                          className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${item.source === 'inflatable_office' ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Price ($)</label>
                        <input
                          type="number" min="0"
                          value={item.price}
                          onChange={e => update(item.id, 'price', e.target.value)}
                          disabled={item.source === 'inflatable_office'}
                          className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${item.source === 'inflatable_office' ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                        <select
                          value={item.category}
                          onChange={e => update(item.id, 'category', e.target.value)}
                          disabled={item.source === 'inflatable_office'}
                          className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${item.source === 'inflatable_office' ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`}
                        >
                          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Tags <span className="font-normal text-gray-400">(semicolon-separated, e.g. tssa; outdoor)</span>
                        </label>
                        <input
                          value={item.tags}
                          onChange={e => update(item.id, 'tags', e.target.value)}
                          placeholder="tssa; outdoor; water"
                          disabled={item.source === 'inflatable_office'}
                          className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${item.source === 'inflatable_office' ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                        <textarea
                          value={item.description}
                          onChange={e => update(item.id, 'description', e.target.value)}
                          rows={2}
                          disabled={item.source === 'inflatable_office'}
                          className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${item.source === 'inflatable_office' ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Min Age</label>
                        <input type="number" min="0" value={item.ageMin}
                          onChange={e => update(item.id, 'ageMin', e.target.value)}
                          disabled={item.source === 'inflatable_office'}
                          className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${item.source === 'inflatable_office' ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Max Age</label>
                        <input type="number" min="0" value={item.ageMax}
                          onChange={e => update(item.id, 'ageMax', e.target.value)}
                          disabled={item.source === 'inflatable_office'}
                          className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${item.source === 'inflatable_office' ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Guest Capacity</label>
                        <input type="number" min="0" value={item.guestCapacity}
                          onChange={e => update(item.id, 'guestCapacity', e.target.value)}
                          disabled={item.source === 'inflatable_office'}
                          className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${item.source === 'inflatable_office' ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Image URL</label>
                        <input
                          value={item.image}
                          onChange={e => update(item.id, 'image', e.target.value)}
                          placeholder="https://..."
                          disabled={item.source === 'inflatable_office'}
                          className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${item.source === 'inflatable_office' ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Product Page URL <span className="text-gray-400 font-normal">(optional — links &quot;View details&quot; in widget)</span></label>
                        <input
                          value={item.url || ''}
                          onChange={e => update(item.id, 'url', e.target.value)}
                          placeholder="https://yoursite.com/products/bouncy-castle"
                          disabled={item.source === 'inflatable_office'}
                          className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${item.source === 'inflatable_office' ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!loading && (
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Item
              </button>
              <div className="flex items-center gap-3">
                {saveMsg && (
                  <span className={`text-xs font-medium ${saveMsg.startsWith('Saved') ? 'text-green-600' : 'text-red-600'}`}>
                    {saveMsg.startsWith('Saved') ? '✓ ' : '✗ '}{saveMsg}
                  </span>
                )}
                <button
                  type="button"
                  onClick={save}
                  disabled={!dirty || saving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-40 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Inventory'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface Lead {
  id: string
  createdAt: string
  firstName: string
  phone: string
  email?: string
  eventDate?: string
  eventDescription: string
  interestedItems: Array<{ name: string; price: number }>
  estimatedValue: number
}

function LeadsPanel() {
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/leads')
      const data = await res.json()
      setLeads(data.leads || [])
    } catch {
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  const toggle = () => {
    if (!open) load()
    setOpen(o => !o)
  }

  const exportCSV = () => {
    if (!leads?.length) return
    const header = ['Date', 'Name', 'Phone', 'Email', 'Event Date', 'Event Description', 'Items', 'Estimated Value']
    const rows = leads.map(l => [
      new Date(l.createdAt).toLocaleDateString(),
      l.firstName,
      l.phone,
      l.email || '',
      l.eventDate || '',
      `"${l.eventDescription.replace(/"/g, '""')}"`,
      `"${l.interestedItems.map(i => `${i.name} ($${i.price})`).join(', ').replace(/"/g, '""')}"`,
      `$${l.estimatedValue}`,
    ])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalValue = leads?.reduce((s, l) => s + l.estimatedValue, 0) ?? 0

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1E2B3C] flex items-center justify-center shrink-0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">Leads</div>
            <div className="text-xs text-gray-500">
              {leads === null ? 'Click to load' : `${leads.length} lead${leads.length !== 1 ? 's' : ''}${leads.length > 0 ? ` · $${totalValue.toLocaleString()} estimated value` : ''}`}
            </div>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100">
          {loading && (
            <div className="px-6 py-8 text-center text-sm text-gray-400">Loading leads...</div>
          )}

          {!loading && leads?.length === 0 && (
            <div className="px-6 py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">No leads yet</p>
              <p className="text-xs text-gray-400 mt-1">Leads will appear here when customers fill out the form in your widget.</p>
            </div>
          )}

          {!loading && leads && leads.length > 0 && (
            <>
              {/* Stats bar */}
              <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
                {[
                  { label: 'Total Leads', value: leads.length },
                  { label: 'Est. Pipeline', value: `$${totalValue.toLocaleString()}` },
                  { label: 'Avg. Value', value: `$${Math.round(totalValue / leads.length).toLocaleString()}` },
                ].map(stat => (
                  <div key={stat.label} className="px-4 py-3 text-center">
                    <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                    <div className="text-xs text-gray-400">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Lead rows */}
              <div className="divide-y divide-gray-50">
                {leads.map(lead => (
                  <div key={lead.id}>
                    <div
                      className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#B03A3A]/10 flex items-center justify-center shrink-0 text-xs font-bold text-[#B03A3A]">
                        {lead.firstName.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900">{lead.firstName}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {lead.phone}{lead.eventDate ? ` · ${lead.eventDate}` : ''}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-gray-800">${lead.estimatedValue.toLocaleString()}</div>
                        <div className="text-xs text-gray-400">{new Date(lead.createdAt).toLocaleDateString()}</div>
                      </div>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        className={`text-gray-300 transition-transform shrink-0 ${expanded === lead.id ? 'rotate-90' : ''}`}>
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>

                    {expanded === lead.id && (
                      <div className="px-5 pb-4 pt-1 bg-gray-50 border-t border-gray-100 space-y-3">
                        {/* Contact */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-gray-400">Phone</span><div className="font-medium text-gray-800 mt-0.5">{lead.phone}</div></div>
                          {lead.email && <div><span className="text-gray-400">Email</span><div className="font-medium text-gray-800 mt-0.5">{lead.email}</div></div>}
                          {lead.eventDate && <div><span className="text-gray-400">Event Date</span><div className="font-medium text-gray-800 mt-0.5">{lead.eventDate}</div></div>}
                        </div>

                        {/* Event description */}
                        {lead.eventDescription && (
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Event Description</div>
                            <div className="text-xs text-gray-700 leading-relaxed bg-white rounded-lg px-3 py-2 border border-gray-100">{lead.eventDescription}</div>
                          </div>
                        )}

                        {/* Items */}
                        {lead.interestedItems.length > 0 && (
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Interested Items</div>
                            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden divide-y divide-gray-50">
                              {lead.interestedItems.map((item, i) => (
                                <div key={i} className="flex items-center justify-between px-3 py-2">
                                  <span className="text-xs text-gray-700">{item.name}</span>
                                  <span className="text-xs font-semibold text-gray-800">${item.price}</span>
                                </div>
                              ))}
                              <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
                                <span className="text-xs font-semibold text-gray-600">Estimated Total</span>
                                <span className="text-xs font-bold text-[#B03A3A]">${lead.estimatedValue.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Quick actions */}
                        <div className="flex gap-2 pt-1">
                          <a href={`tel:${lead.phone}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E2B3C] text-white text-xs font-semibold hover:bg-[#2a3d55] transition-colors">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                            </svg>
                            Call
                          </a>
                          {lead.email && (
                            <a href={`mailto:${lead.email}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                              </svg>
                              Email
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Export */}
              <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={exportCSV}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Export CSV
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function InfoPopover({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-5 h-5 rounded-full border border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 flex items-center justify-center text-xs font-bold transition-colors"
        aria-label="Help"
      >
        ?
      </button>
      {open && (
        <div className="absolute left-0 top-7 z-50 w-72 bg-white border border-gray-200 rounded-2xl shadow-lg p-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-3 right-3 text-gray-300 hover:text-gray-500"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          <div className="text-sm text-gray-600 leading-relaxed space-y-2 pr-4">
            {children}
          </div>
        </div>
      )}
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
