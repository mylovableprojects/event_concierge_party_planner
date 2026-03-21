'use client'

import { useState } from 'react'

export default function SubscribePage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCheckout = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/checkout/resume', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not start checkout')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F0EA] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1E2B3C] mb-2">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-[#1E2B3C] tracking-tight">One step to go</h1>
        <p className="text-gray-500 text-lg">Complete your subscription to unlock your admin panel and start using your AI rental concierge.</p>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-left space-y-3">
          {[
            'AI chat widget on your website',
            'Full inventory management',
            'Lead capture + CRM webhook',
            'All 4 cart modes',
            'Unlimited conversations',
          ].map(f => (
            <div key={f} className="flex items-center gap-3 text-sm text-gray-700">
              <svg className="shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E8A020" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              {f}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <button onClick={handleCheckout} disabled={loading}
          className="w-full py-4 rounded-xl bg-[#B03A3A] text-white font-semibold text-base hover:bg-[#9a3232] disabled:opacity-50 transition-colors shadow-lg shadow-[#B03A3A]/20">
          {loading ? 'Loading checkout...' : 'Subscribe — $297/year →'}
        </button>
        <p className="text-xs text-gray-400">Secure checkout via Stripe · Cancel anytime</p>

        <p className="text-sm text-gray-500">
          Wrong account?{' '}
          <a href="/api/logout" className="text-[#B03A3A] font-semibold hover:underline">Log out</a>
        </p>
      </div>
    </div>
  )
}
