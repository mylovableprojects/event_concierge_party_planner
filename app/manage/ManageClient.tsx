'use client'

import { useState } from 'react'
import { CompanyConfig } from '@/lib/inventory'

interface Props {
  companies: CompanyConfig[]
}

export default function ManageClient({ companies: initial }: Props) {
  const [companies, setCompanies] = useState(initial)
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)

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

  const active = companies.filter(c => c.subscriptionActive).length
  const total = companies.length

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E2B3C', margin: '0 0 4px' }}>
          Rental Concierge — Accounts
        </h1>
        <p style={{ color: '#666', margin: 0 }}>
          {active} active · {total - active} inactive · {total} total
        </p>
      </div>

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
