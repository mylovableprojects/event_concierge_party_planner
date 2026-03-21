'use client'

import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

interface InventoryItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  image: string
}

interface CompanyConfig {
  id: string
  name: string
  tagline: string
  primaryColor: string
  accentColor: string
  navyColor: string
  logoText: string
  cartMode: 'enabled' | 'inquire' | 'hidden'
  cartInquireUrl: string
  webhookUrl: string
}

interface RecommendedItem extends InventoryItem {
  reason?: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AssistantMessage {
  type: 'assistant'
  text: string
  recommendations: RecommendedItem[]
  upsells: RecommendedItem[]
  followUpQuestion: string | null
}

interface UserMessage {
  type: 'user'
  text: string
}

type Message = UserMessage | AssistantMessage

const QUICK_PROMPTS = [
  'Birthday for my 6 year old, 15 kids',
  'Church picnic with 100+ guests',
  'Toddler-friendly backyard party',
]

function WidgetContent() {
  const searchParams = useSearchParams()
  const companyId = searchParams.get('company') || 'demo'

  const [config, setConfig] = useState<CompanyConfig | null>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [cart, setCart] = useState<Set<string>>(new Set())
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [leadSubmitted, setLeadSubmitted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load company config + inventory
  useEffect(() => {
    fetch(`/api/company?id=${companyId}`)
      .then(r => r.json())
      .then(data => {
        if (data.config) setConfig(data.config)
        if (data.inventory) setInventory(data.inventory)
      })
      .catch(console.error)
  }, [companyId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const inventoryMap = Object.fromEntries(inventory.map(i => [i.id, i]))

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: UserMessage = { type: 'user', text }
    const newChatHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: text }]

    setMessages(prev => [...prev, userMsg])
    setChatHistory(newChatHistory)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newChatHistory, companyId }),
      })
      const data = await res.json()

      const recs: RecommendedItem[] = (data.recommendations || [])
        .map((r: { id: string; reason: string }) => inventoryMap[r.id] ? { ...inventoryMap[r.id], reason: r.reason } : null)
        .filter(Boolean)

      const ups: RecommendedItem[] = (data.upsells || [])
        .map((r: { id: string; reason: string }) => inventoryMap[r.id] ? { ...inventoryMap[r.id], reason: r.reason } : null)
        .filter(Boolean)

      const assistantMsg: AssistantMessage = {
        type: 'assistant',
        text: data.message || '',
        recommendations: recs,
        upsells: ups,
        followUpQuestion: data.followUpQuestion || null,
      }

      setMessages(prev => [...prev, assistantMsg])
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.message || '' }])
    } catch {
      setMessages(prev => [...prev, {
        type: 'assistant',
        text: 'Sorry, something went wrong. Please try again.',
        recommendations: [],
        upsells: [],
        followUpQuestion: null,
      }])
    } finally {
      setLoading(false)
    }
  }, [loading, chatHistory, companyId, inventoryMap])

  const cartMode = config?.cartMode || 'enabled'
  const cartInquireUrl = config?.cartInquireUrl || ''

  const handleAdd = (item: InventoryItem) => {
    if (cartMode === 'inquire') {
      const url = cartInquireUrl || '#'
      window.parent.postMessage({ type: 'CONCIERGE_INQUIRE', item: { id: item.id, name: item.name, price: item.price } }, '*')
      if (url !== '#') window.open(url, '_blank')
      return
    }
    setCart(prev => new Set([...prev, item.id]))
    window.parent.postMessage({
      type: 'CONCIERGE_ADD_TO_CART',
      item: { id: item.id, name: item.name, price: item.price },
    }, '*')
  }

  const primary = config?.primaryColor || '#B03A3A'
  const accent = config?.accentColor || '#E8A020'
  const navy = config?.navyColor || '#1E2B3C'
  const hasWebhook = !!config?.webhookUrl

  const cartTotal = inventory.filter(i => cart.has(i.id)).reduce((sum, i) => sum + i.price, 0)

  // Collect interested items from cart + any items seen in last assistant message
  const getInterestedItems = () => {
    const allItems = [...inventory]
    return allItems
      .filter(i => cart.has(i.id))
      .map(i => ({ name: i.name, price: i.price }))
  }

  // Build event description from conversation
  const getEventDescription = () => {
    const userMessages = chatHistory.filter(m => m.role === 'user').map(m => m.content)
    return userMessages.join(' / ')
  }

  return (
    <div className="flex flex-col h-screen bg-[#F5F0EA] font-sans" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${primary}, ${navy})` }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">{config?.name || 'Event Concierge'}</div>
            <div className="text-xs text-gray-500">{config?.tagline || 'Find the perfect rentals'}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setChatHistory([]); setCart(new Set()); setShowLeadForm(false); setLeadSubmitted(false) }}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-50"
              title="Start over"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
            </button>
          )}
          <button
            onClick={() => window.parent.postMessage({ type: 'CONCIERGE_CLOSE' }, '*')}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <EmptyState accent={accent} onSelect={sendMessage} />
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            {msg.type === 'user' && (
              <div className="flex justify-end">
                <div
                  className="max-w-[75%] px-4 py-2 rounded-2xl rounded-tr-sm text-white text-sm font-medium"
                  style={{ background: accent }}
                >
                  {msg.text}
                </div>
              </div>
            )}

            {msg.type === 'assistant' && (
              <div className="space-y-3">
                {msg.text && (
                  <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-[90%]">
                    <p className="text-sm text-gray-800 leading-relaxed">{msg.text}</p>
                  </div>
                )}

                {msg.recommendations.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Recommended for You</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {msg.recommendations.map(item => (
                        <ProductCard
                          key={item.id}
                          item={item}
                          primary={primary}
                          inCart={cart.has(item.id)}
                          onAdd={handleAdd}
                          cartMode={cartMode}
                          featured
                        />
                      ))}
                    </div>
                  </div>
                )}

                {msg.upsells.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">You Might Also Like</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {msg.upsells.map(item => (
                        <ProductCard
                          key={item.id}
                          item={item}
                          primary={primary}
                          inCart={cart.has(item.id)}
                          onAdd={handleAdd}
                          cartMode={cartMode}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {msg.followUpQuestion && (
                  <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-[90%]">
                    <p className="text-sm text-gray-600 italic leading-relaxed">{msg.followUpQuestion}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-1 items-center bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm w-fit">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ background: primary, animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}

        {/* Check Availability CTA — shown after first recommendations, only if webhook configured */}
        {hasWebhook && messages.some(m => m.type === 'assistant' && (m as AssistantMessage).recommendations.length > 0) && !loading && (
          leadSubmitted ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-4 text-center">
              <div className="text-green-700 font-semibold text-sm">You&apos;re all set!</div>
              <div className="text-green-600 text-xs mt-1">We&apos;ll be in touch shortly to confirm availability.</div>
            </div>
          ) : showLeadForm ? (
            <LeadCaptureForm
              primary={primary}
              navy={navy}
              companyId={companyId}
              eventDescription={getEventDescription()}
              interestedItems={getInterestedItems()}
              onSubmitted={() => setLeadSubmitted(true)}
              onCancel={() => setShowLeadForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowLeadForm(true)}
              className="w-full py-3 rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm"
              style={{ background: navy }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              Check Availability / Get a Quote
            </button>
          )
        )}

        <div ref={bottomRef} />
      </div>

      {/* Cart summary — only shown when cartMode is enabled */}
      {cartMode === 'enabled' && cart.size > 0 && (
        <div
          className="mx-4 mb-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium flex items-center justify-between"
          style={{ background: navy }}
        >
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.9-1.38l1.56-5.62H6"/>
            </svg>
            <span>{cart.size} item{cart.size !== 1 ? 's' : ''}</span>
            <span className="opacity-50">·</span>
            <span className="font-bold">${cartTotal.toLocaleString()}</span>
          </div>
          <button
            onClick={() => window.parent.postMessage({ type: 'CONCIERGE_VIEW_CART' }, '*')}
            className="text-xs underline opacity-80 hover:opacity-100"
          >
            View cart →
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 bg-[#F5F0EA]">
        <form
          onSubmit={e => { e.preventDefault(); sendMessage(input) }}
          className="flex items-center gap-2 bg-white rounded-2xl shadow-sm px-4 py-2 border border-gray-100"
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Describe your event... (e.g., 'Birthday party for 15 kids, ages 5–8')"
            className="flex-1 text-sm text-gray-800 bg-transparent outline-none placeholder:text-gray-400"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-opacity disabled:opacity-40 shrink-0"
            style={{ background: primary }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}

function EmptyState({ accent, onSelect }: { accent: string; onSelect: (t: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[360px] gap-5 text-center px-6">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: `${accent}20` }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
      </div>
      <div className="space-y-1.5">
        <h2 className="font-bold text-gray-900 text-[17px]">Tell me about your event!</h2>
        <p className="text-gray-500 text-sm max-w-[240px] mx-auto leading-relaxed">
          Describe your party and I&apos;ll recommend the perfect rentals.
        </p>
        <div className="flex items-center justify-center gap-1.5 pt-1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill={accent} strokeWidth="0">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span className="text-xs text-gray-400">Join 200+ families who found their perfect rentals.</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-[280px]">
        <p className="text-xs text-gray-400 font-medium">Try something like:</p>
        {QUICK_PROMPTS.map(p => (
          <button
            key={p}
            onClick={() => onSelect(p)}
            className="text-sm text-gray-700 bg-white border border-gray-200 rounded-full px-4 py-2.5 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left shadow-sm"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}

function ProductCard({
  item,
  primary,
  inCart,
  onAdd,
  cartMode = 'enabled',
  featured = false,
}: {
  item: RecommendedItem
  primary: string
  inCart: boolean
  onAdd: (item: InventoryItem) => void
  cartMode?: 'enabled' | 'inquire' | 'hidden'
  featured?: boolean
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Image */}
      <div className="w-[60px] h-[60px] rounded-xl overflow-hidden bg-gray-100 shrink-0 relative">
        {item.image && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
          </div>
        )}
        {featured && (
          <div
            className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: `${primary}22` }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill={primary} strokeWidth="0">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 text-sm leading-tight">{item.name}</div>
        <div className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
          {item.reason || item.description}
        </div>
        <div className="font-bold text-sm mt-1" style={{ color: primary }}>${item.price}</div>
      </div>

      {/* Action button — varies by cartMode */}
      {cartMode === 'enabled' && (
        <button
          onClick={() => onAdd(item)}
          disabled={inCart}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-white text-xs font-semibold transition-opacity disabled:opacity-60"
          style={{ background: inCart ? '#9CA3AF' : primary }}
        >
          {inCart ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
              Added
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
              Add
            </>
          )}
        </button>
      )}
      {cartMode === 'inquire' && (
        <button
          onClick={() => onAdd(item)}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-white text-xs font-semibold"
          style={{ background: primary }}
        >
          Inquire
        </button>
      )}
    </div>
  )
}

function LeadCaptureForm({
  primary,
  navy,
  companyId,
  eventDescription,
  interestedItems,
  onSubmitted,
  onCancel,
}: {
  primary: string
  navy: string
  companyId: string
  eventDescription: string
  interestedItems: Array<{ name: string; price: number }>
  onSubmitted: () => void
  onCancel: () => void
}) {
  const [firstName, setFirstName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, firstName, phone, email, eventDate, eventDescription, interestedItems }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      onSubmitted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 pt-4 pb-3" style={{ background: `${navy}10` }}>
        <div className="font-semibold text-gray-900 text-sm">Check Availability / Get a Quote</div>
        <div className="text-xs text-gray-500 mt-0.5">Leave your details and we&apos;ll confirm availability for your event.</div>
      </div>
      <form onSubmit={handleSubmit} className="px-4 py-3 space-y-3">
        <div>
          <input
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="Your first name"
            required
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': primary } as React.CSSProperties}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Event date (optional)</label>
          <input
            type="date"
            value={eventDate}
            onChange={e => setEventDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 text-gray-700"
          />
        </div>
        <div>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Phone number"
            required
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
          />
        </div>
        <div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email (optional)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-opacity"
            style={{ background: primary }}
          >
            {submitting ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function WidgetPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#F5F0EA] flex items-center justify-center text-gray-400 text-sm">Loading...</div>}>
      <WidgetContent />
    </Suspense>
  )
}
