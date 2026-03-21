'use client'

import { useState } from 'react'
import { CompanyConfig } from '@/lib/inventory'

interface Props {
  companies: CompanyConfig[]
}

const emptyForm = { companyName: '', yourName: '', email: '', phone: '', password: '' }

export default function ManageClient({ companies: initial }: Props) {
  const [companies, setCompanies] = useState(initial)
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')
  const [resetId, setResetId] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetSaving, setResetSaving] = useState(false)
  const [resetMsg, setResetMsg] = useState('')

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  async function toggle(companyId: string, current: boolean) {
    setToggling(companyId)
    const res = await fetch('/api/manage/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, active: !current }),
    })
    if (res.ok) {
      setCompanies(prev =>
        prev.map(c => c.id === companyId ? { ...c, subscriptionActive: !current } : c)
      )
    }
    setToggling(null)
  }

  async function saveResetPassword(companyId: string) {
    setResetSaving(true)
    setResetMsg('')
    const res = await fetch('/api/manage/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, password: resetPassword }),
    })
    const data = await res.json()
    if (res.ok) {
      setResetMsg('Password updated.')
      setResetPassword('')
      setTimeout(() => { setResetId(null); setResetMsg('') }, 1500)
    } else {
      setResetMsg(data.error || 'Something went wrong')
    }
    setResetSaving(false)
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError('')
    setCreateSuccess('')
    const res = await fetch('/api/manage/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (res.ok) {
      setCreateSuccess(`Account created: ${data.companyId}`)
      setForm(emptyForm)
      setShowCreate(false)
      // Reload to show new account in list
      window.location.reload()
    } else {
      setCreateError(data.error || 'Something went wrong')
    }
    setCreating(false)
  }

  const active = companies.filter(c => c.subscriptionActive).length
  const total = companies.length

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E2B3C', margin: '0 0 4px' }}>
            Rental Concierge — Accounts
          </h1>
          <p style={{ color: '#666', margin: 0 }}>
            {active} active · {total - active} inactive · {total} total
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(!showCreate); setCreateError(''); setCreateSuccess('') }}
          style={{
            padding: '10px 18px', background: '#1E2B3C', color: '#fff', border: 'none',
            borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {showCreate ? 'Cancel' : '+ Create Free Account'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={createAccount} style={{
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
          padding: 24, marginBottom: 28,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E2B3C', margin: '0 0 16px' }}>
            Create Free Account
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { key: 'companyName', label: 'Company Name *', type: 'text' },
              { key: 'yourName', label: 'Contact Name', type: 'text' },
              { key: 'email', label: 'Email *', type: 'email' },
              { key: 'phone', label: 'Phone', type: 'tel' },
              { key: 'password', label: 'Password * (min 8 chars)', type: 'password' },
            ].map(({ key, label, type }) => (
              <div key={key} style={key === 'password' ? { gridColumn: '1 / -1' } : {}}>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>{label}</label>
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  required={['companyName', 'email', 'password'].includes(key)}
                  style={{
                    width: '100%', padding: '8px 12px', fontSize: 14, borderRadius: 6,
                    border: '1px solid #ddd', boxSizing: 'border-box', outline: 'none',
                  }}
                />
              </div>
            ))}
          </div>
          {createError && <p style={{ color: '#dc2626', fontSize: 13, margin: '12px 0 0' }}>{createError}</p>}
          {createSuccess && <p style={{ color: '#16a34a', fontSize: 13, margin: '12px 0 0' }}>{createSuccess}</p>}
          <button
            type="submit"
            disabled={creating}
            style={{
              marginTop: 16, padding: '10px 24px', background: '#B03A3A', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              opacity: creating ? 0.7 : 1,
            }}
          >
            {creating ? 'Creating…' : 'Create Account (Free Access)'}
          </button>
        </form>
      )}

      <input
        type="text"
        placeholder="Search by name or email…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '10px 14px', fontSize: 14,
          border: '1px solid #ddd', borderRadius: 8, marginBottom: 24,
          boxSizing: 'border-box', outline: 'none',
        }}
      />

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
            <th style={{ padding: '8px 12px', color: '#888', fontWeight: 600 }}>Company</th>
            <th style={{ padding: '8px 12px', color: '#888', fontWeight: 600 }}>Email</th>
            <th style={{ padding: '8px 12px', color: '#888', fontWeight: 600 }}>Phone</th>
            <th style={{ padding: '8px 12px', color: '#888', fontWeight: 600 }}>Provider</th>
            <th style={{ padding: '8px 12px', color: '#888', fontWeight: 600 }}>Status</th>
            <th style={{ padding: '8px 12px', color: '#888', fontWeight: 600 }}>Access</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(c => (
            <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '12px 12px', fontWeight: 600, color: '#1E2B3C' }}>
                {c.name}
                <div style={{ fontSize: 11, color: '#aaa', fontWeight: 400 }}>{c.id}</div>
              </td>
              <td style={{ padding: '12px 12px', color: '#444' }}>{c.email || '—'}</td>
              <td style={{ padding: '12px 12px', color: '#444' }}>{c.phone || '—'}</td>
              <td style={{ padding: '12px 12px', color: '#444' }}>{c.apiProvider || 'anthropic'}</td>
              <td style={{ padding: '12px 12px' }}>
                <span style={{
                  display: 'inline-block', padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                  background: c.subscriptionActive ? '#dcfce7' : '#fee2e2',
                  color: c.subscriptionActive ? '#16a34a' : '#dc2626',
                }}>
                  {c.subscriptionActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td style={{ padding: '12px 12px' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => toggle(c.id, !!c.subscriptionActive)}
                    disabled={toggling === c.id}
                    style={{
                      padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      border: 'none',
                      background: c.subscriptionActive ? '#fee2e2' : '#dcfce7',
                      color: c.subscriptionActive ? '#dc2626' : '#16a34a',
                      opacity: toggling === c.id ? 0.6 : 1,
                    }}
                  >
                    {toggling === c.id ? '…' : c.subscriptionActive ? 'Revoke' : 'Grant Free'}
                  </button>
                  <button
                    onClick={() => { setResetId(resetId === c.id ? null : c.id); setResetPassword(''); setResetMsg('') }}
                    style={{
                      padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      border: '1px solid #ddd', background: '#fff', color: '#444',
                    }}
                  >
                    {resetId === c.id ? 'Cancel' : 'Set Password'}
                  </button>
                </div>
                {resetId === c.id && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="New password"
                      value={resetPassword}
                      onChange={e => setResetPassword(e.target.value)}
                      style={{
                        padding: '6px 10px', fontSize: 13, borderRadius: 6,
                        border: '1px solid #ddd', outline: 'none', width: 160,
                      }}
                    />
                    <button
                      onClick={() => saveResetPassword(c.id)}
                      disabled={resetSaving || resetPassword.length < 8}
                      style={{
                        padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                        border: 'none', background: '#1E2B3C', color: '#fff', cursor: 'pointer',
                        opacity: resetSaving || resetPassword.length < 8 ? 0.5 : 1,
                      }}
                    >
                      {resetSaving ? '…' : 'Save'}
                    </button>
                    {resetMsg && <span style={{ fontSize: 12, color: resetMsg === 'Password updated.' ? '#16a34a' : '#dc2626' }}>{resetMsg}</span>}
                  </div>
                )}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>
                No accounts found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
