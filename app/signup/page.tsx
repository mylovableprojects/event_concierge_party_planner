'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    companyName: '', yourName: '', email: '', password: '', phone: '',
    apiProvider: 'anthropic', apiKey: '', resendKey: '',
  })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [testingResend, setTestingResend] = useState(false)
  const [resendTestResult, setResendTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
    if (field === 'apiKey' || field === 'apiProvider') setTestResult(null)
    if (field === 'resendKey') setResendTestResult(null)
  }

  const testResendKey = async () => {
    if (!form.resendKey.trim()) return
    setTestingResend(true)
    setResendTestResult(null)
    try {
      const res = await fetch('/api/test-resend-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: form.resendKey }),
      })
      const data = await res.json()
      setResendTestResult(data.valid ? { ok: true, msg: 'Key is valid!' } : { ok: false, msg: data.error })
    } catch {
      setResendTestResult({ ok: false, msg: 'Could not reach validation endpoint' })
    } finally {
      setTestingResend(false)
    }
  }

  const testKey = async () => {
    if (!form.apiKey.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/test-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: form.apiProvider, apiKey: form.apiKey }),
      })
      const data = await res.json()
      setTestResult(data.valid ? { ok: true, msg: 'Key is valid!' } : { ok: false, msg: data.error })
    } catch {
      setTestResult({ ok: false, msg: 'Could not reach validation endpoint' })
    } finally {
      setTesting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Signup failed')
      router.push(`/signup/success?company=${data.companyId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const providerLabel = form.apiProvider === 'anthropic' ? 'Anthropic' : 'OpenAI'

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

          {/* Account fields */}
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

          {/* API Key section */}
          <div className="border-t border-gray-100 pt-5 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">AI Provider</label>
              <p className="text-xs text-gray-400 mb-2">Your key is encrypted with AES-256 and never stored in plaintext.</p>
              <select value={form.apiProvider} onChange={set('apiProvider')}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#B03A3A]/40 focus:border-[#B03A3A]">
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI (ChatGPT)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{providerLabel} API Key</label>
              <div className="flex gap-2">
                <input type="password" value={form.apiKey} onChange={set('apiKey')}
                  placeholder={form.apiProvider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
                  required
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#B03A3A]/40 focus:border-[#B03A3A]" />
                <button type="button" onClick={testKey} disabled={!form.apiKey.trim() || testing}
                  className="shrink-0 px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors whitespace-nowrap">
                  {testing ? 'Testing...' : 'Test Key'}
                </button>
              </div>
              {testResult && (
                <p className={`mt-1.5 text-xs font-medium ${testResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {testResult.ok ? '✓ ' : '✗ '}{testResult.msg}
                </p>
              )}
              <p className="mt-1.5 text-xs text-gray-400">
                {form.apiProvider === 'anthropic'
                  ? 'Get your key at console.anthropic.com'
                  : 'Get your key at platform.openai.com'}
              </p>
            </div>
          </div>

          {/* Resend section */}
          <div className="border-t border-gray-100 pt-5 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resend API Key <span className="text-gray-400 font-normal">(optional — for lead email notifications)</span>
              </label>
              <p className="text-xs text-gray-400 mb-2">When a customer fills out the lead form in your widget, we&apos;ll email you the details. Get your key at resend.com.</p>
              <div className="flex gap-2">
                <input type="password" value={form.resendKey} onChange={set('resendKey')}
                  placeholder="re_..."
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#B03A3A]/40 focus:border-[#B03A3A]" />
                <button type="button" onClick={testResendKey} disabled={!form.resendKey.trim() || testingResend}
                  className="shrink-0 px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors whitespace-nowrap">
                  {testingResend ? 'Testing...' : 'Test Key'}
                </button>
              </div>
              {resendTestResult && (
                <p className={`mt-1.5 text-xs font-medium ${resendTestResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {resendTestResult.ok ? '✓ ' : '✗ '}{resendTestResult.msg}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-[#B03A3A] text-white font-semibold text-sm hover:bg-[#9a3232] disabled:opacity-50 transition-colors">
            {loading ? 'Creating account...' : 'Create Account →'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <a href="/login" className="text-[#B03A3A] font-semibold hover:underline">Log in</a>
          </p>
        </form>
      </div>
    </div>
  )
}
