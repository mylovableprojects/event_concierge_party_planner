'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    companyName: '', yourName: '', email: '', password: '', phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // Step 1: Create account
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Signup failed')

      // Step 2: Create Stripe checkout session and redirect
      const checkoutRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: data.companyId }),
      })
      const checkoutData = await checkoutRes.json()
      if (!checkoutRes.ok) throw new Error(checkoutData.error || 'Could not start checkout')

      window.location.href = checkoutData.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F0EA] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-8">

        <div className="text-center">
          <a href="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-[#1E2B3C] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <span className="font-semibold text-[#1E2B3C]">Event Concierge</span>
          </a>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Create your account</h1>
          <p className="text-gray-500 mt-2">Set up your AI rental widget in minutes.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
            <input value={form.companyName} onChange={set('companyName')} placeholder="Bounce Bros Party Rentals" required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B03A3A]/40 focus:border-[#B03A3A]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name</label>
            <input value={form.yourName} onChange={set('yourName')} placeholder="Jane Smith" required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B03A3A]/40 focus:border-[#B03A3A]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="jane@bouncebros.com" required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B03A3A]/40 focus:border-[#B03A3A]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <input type="password" value={form.password} onChange={set('password')} placeholder="At least 8 characters" required minLength={8}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B03A3A]/40 focus:border-[#B03A3A]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input type="tel" value={form.phone} onChange={set('phone')} placeholder="(555) 123-4567"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B03A3A]/40 focus:border-[#B03A3A]" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-[#B03A3A] text-white font-semibold text-sm hover:bg-[#9a3232] disabled:opacity-50 transition-colors">
            {loading ? 'Redirecting to checkout...' : 'Continue to Payment — $297/yr →'}
          </button>
          <p className="text-center text-xs text-gray-400">Secure checkout via Stripe</p>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <a href="/login" className="text-[#B03A3A] font-semibold hover:underline">Log in</a>
          </p>
        </form>
      </div>
    </div>
  )
}
