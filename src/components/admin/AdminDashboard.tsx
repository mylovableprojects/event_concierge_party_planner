import Link from 'next/link'
import AdminDashboardActions from './AdminDashboardActions'

import type { CompanyConfig, Lead } from '@/lib/inventory'

type IoStatus = {
  connected: boolean
  status: string
  lastSynced: string | null
}

type Props = {
  companyId: string
  config: CompanyConfig
  inventoryCount: number
  ioStatus: IoStatus
  ioInventoryCount: number | null
  ioCategoriesCount: number | null
  recentLeads30dCount: number
  recentLeads: Lead[]
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-2xl bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-gray-900">{value}</div>
      {sub && <div className="mt-1 text-sm text-gray-600">{sub}</div>}
    </div>
  )
}

function Badge({ tone, children }: { tone: 'green' | 'red' | 'gray'; children: React.ReactNode }) {
  const cls = tone === 'green'
    ? 'bg-green-50 text-green-700 border-green-200'
    : tone === 'red'
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-gray-50 text-gray-700 border-gray-200'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold border ${cls}`}>
      {children}
    </span>
  )
}

export default function AdminDashboard(props: Props) {
  const {
    companyId,
    config,
    inventoryCount,
    ioStatus,
    ioInventoryCount,
    ioCategoriesCount,
    recentLeads30dCount,
    recentLeads,
  } = props

  const companyInfoAdded = !!config?.name?.trim()
  const inventoryAdded = inventoryCount > 0
  const ioConnected = ioStatus.connected
  const widgetEmbedded = Boolean((config as unknown as { embedVerified?: boolean }).embedVerified)

  const steps = [
    { label: 'Account created', ok: true },
    { label: 'Company info added', ok: companyInfoAdded },
    { label: 'Inventory added', ok: inventoryAdded },
    { label: 'InflatableOffice connected', ok: ioConnected },
    { label: 'Widget embedded on website', ok: widgetEmbedded },
  ]

  const completed = steps.filter(s => s.ok).length
  const total = steps.length
  const pct = clamp(Math.round((completed / total) * 100), 0, 100)

  const ioBadgeTone = ioConnected ? 'green' : 'red'
  const ioBadgeText = ioConnected ? 'Connected' : 'Not Connected'
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  const widgetPreviewSrc = baseUrl
    ? `${baseUrl}/widget?company=${encodeURIComponent(companyId)}`
    : `/widget?company=${encodeURIComponent(companyId)}`

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">Dashboard</div>
          <div className="mt-1 text-gray-600 text-sm">
            Overview for <span className="font-semibold text-gray-900">{config.name || companyId}</span>
          </div>
        </div>
        <div className="shrink-0 hidden sm:block">
          <AdminDashboardActions companyId={companyId} />
        </div>
      </div>

      {/* A — Quick Setup Checklist */}
      <section className="border border-gray-200 rounded-2xl bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-extrabold text-gray-900">Quick Setup Checklist</div>
            <div className="text-sm text-gray-600 mt-1">{completed} of {total} steps complete</div>
          </div>
          <div className="text-sm font-semibold text-gray-700">{pct}%</div>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <div className="h-2 bg-[#1E2B3C] rounded-full" style={{ width: `${pct}%` }} />
        </div>

        <ul className="mt-4 grid sm:grid-cols-2 gap-2">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center gap-2 text-sm">
              <span aria-hidden="true">{s.ok ? '✅' : '❌'}</span>
              <span className="text-gray-900 font-semibold">{s.label}</span>
            </li>
          ))}
        </ul>

        {!widgetEmbedded && (
          <div className="mt-4 text-sm text-gray-600">
            Tip: copy your embed code from <Link className="font-semibold text-gray-900 underline underline-offset-2" href="/admin#section-integrations">Integrations</Link>.
          </div>
        )}
      </section>

      {/* B — Stats Row */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Inventory Items" value={ioInventoryCount ?? inventoryCount} sub={ioInventoryCount !== null ? 'From InflatableOffice cache' : 'From local inventory'} />
        <StatCard label="Categories" value={ioCategoriesCount ?? '—'} sub={ioCategoriesCount === null ? 'Connect IO to fetch categories' : 'From InflatableOffice'} />
        <StatCard
          label="IO Connection Status"
          value={<Badge tone={ioBadgeTone}>{ioBadgeText}</Badge>}
          sub={ioStatus.lastSynced ? <>Last synced {fmtDateTime(ioStatus.lastSynced)}</> : 'No sync yet'}
        />
        <StatCard label="Recent Leads (30d)" value={recentLeads30dCount} sub="Saved leads" />
      </section>

      {/* C — Widget Preview */}
      <section className="border border-gray-200 rounded-2xl bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-gray-900">Widget Preview</div>
            <div className="mt-1 text-sm text-gray-600">Preview what customers will see.</div>
          </div>
          <AdminDashboardActions companyId={companyId} variant="previewOnly" />
        </div>
        <div className="mt-4 border border-gray-200 rounded-2xl overflow-hidden bg-gray-50">
          <div className="h-[420px]">
            <iframe
              title="Widget preview"
              src={widgetPreviewSrc}
              className="w-full h-full"
            />
          </div>
        </div>
      </section>

      {/* D — Recent Leads / Activity */}
      <section className="border border-gray-200 rounded-2xl bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-gray-900">Recent Leads</div>
            <div className="mt-1 text-sm text-gray-600">Last 5 submissions.</div>
          </div>
          <Link href="/admin#section-leads" className="text-sm font-semibold text-gray-900 underline underline-offset-2">
            View all
          </Link>
        </div>

        {recentLeads.length === 0 ? (
          <div className="mt-4 border border-dashed border-gray-300 rounded-2xl p-6 text-center">
            <div className="text-sm font-bold text-gray-900">No leads yet</div>
            <div className="mt-1 text-sm text-gray-600">
              Share your widget link and embed it on your site to start collecting leads.
            </div>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Event Type</th>
                  <th className="py-2 pr-4">Date Submitted</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentLeads.map((l) => (
                  <tr key={l.id} className="text-gray-800">
                    <td className="py-3 pr-4 font-semibold text-gray-900">{l.firstName || '—'}</td>
                    <td className="py-3 pr-4">{l.eventDate ? 'Scheduled' : 'New inquiry'}</td>
                    <td className="py-3 pr-4">{fmtDate(l.createdAt)}</td>
                    <td className="py-3 pr-4">
                      <Badge tone="gray">New</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* E — Quick Actions */}
      <section className="border border-gray-200 rounded-2xl bg-white p-5">
        <div className="text-sm font-extrabold text-gray-900">Quick Actions</div>
        <div className="mt-4">
          <AdminDashboardActions companyId={companyId} />
        </div>
      </section>
    </div>
  )
}

