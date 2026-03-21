'use client'

import { useState } from 'react'

export default function LoginForm() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/manage/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      window.location.reload()
    } else {
      setError('Invalid password')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F5F0EA', fontFamily: 'system-ui, sans-serif',
    }}>
      <form onSubmit={submit} style={{
        background: '#fff', borderRadius: 12, padding: 40, width: 320,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1E2B3C', margin: '0 0 24px' }}>
          Manage Accounts
        </h1>
        <input
          type="password"
          placeholder="Superadmin password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{
            width: '100%', padding: '10px 14px', fontSize: 14, borderRadius: 8,
            border: '1px solid #ddd', marginBottom: 12, boxSizing: 'border-box', outline: 'none',
          }}
        />
        {error && <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '10px 0', background: '#B03A3A', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
