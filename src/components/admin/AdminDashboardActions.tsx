'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

type Props = {
  companyId: string
  variant?: 'full' | 'previewOnly'
}

export default function AdminDashboardActions({ companyId, variant = 'full' }: Props) {
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const embedCode = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `<script src="${window.location.origin}/embed.js" data-company="${companyId}"></script>`
  }, [companyId])

  const syncFromIo = async () => {
    setSyncing(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/io/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: companyId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sync failed')
      setToast(`Synced ${data.itemCount ?? ''}`.trim() || 'Synced!')
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
      window.setTimeout(() => setToast(null), 3500)
    }
  }

  const copyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embedCode)
      setToast('Embed code copied')
      window.setTimeout(() => setToast(null), 2500)
    } catch {
      setToast('Could not copy embed code')
      window.setTimeout(() => setToast(null), 2500)
    }
  }

  const previewWidget = () => {
    window.open(`/widget?company=${encodeURIComponent(companyId)}`, '_blank', 'noopener,noreferrer')
  }

  if (variant === 'previewOnly') {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={previewWidget}
          className="rounded-xl px-4 py-2 text-sm font-semibold bg-[#1E2B3C] text-white hover:bg-[#162131]"
        >
          Open Full Preview
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={syncFromIo}
          disabled={syncing}
          className="rounded-xl px-4 py-2 text-sm font-semibold bg-[#1E2B3C] text-white hover:bg-[#162131] disabled:opacity-60"
        >
          {syncing ? 'Syncing…' : 'Sync Inventory from IO'}
        </button>

        <Link
          href="/admin#section-inventory"
          className="rounded-xl px-4 py-2 text-sm font-semibold bg-white border border-gray-200 text-gray-900 hover:bg-gray-50"
        >
          Add Inventory Manually
        </Link>

        <button
          type="button"
          onClick={copyEmbed}
          className="rounded-xl px-4 py-2 text-sm font-semibold bg-white border border-gray-200 text-gray-900 hover:bg-slate-50"
        >
          Copy Embed Code
        </button>

        <button
          type="button"
          onClick={previewWidget}
          className="rounded-xl px-4 py-2 text-sm font-semibold bg-white border border-gray-200 text-gray-900 hover:bg-slate-50"
        >
          Preview Widget
        </button>
      </div>

      {toast && (
        <div className="text-sm font-semibold text-gray-700">
          {toast}
        </div>
      )}
    </div>
  )
}

