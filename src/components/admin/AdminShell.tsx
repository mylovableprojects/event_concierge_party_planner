'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type NavItem = {
  label: string
  href: string
  icon: string
}

const SIDEBAR_WIDTH_PX = 250

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: '🏠' },
  { label: 'Widget Settings', href: '/admin/widget-settings', icon: '🎨' },
  { label: 'Integrations', href: '/admin/integrations', icon: '🔗' },
  { label: 'Inventory', href: '/admin/inventory', icon: '📦' },
  { label: 'Leads', href: '/admin/leads', icon: '📋' },
  { label: 'Settings', href: '/admin/settings', icon: '⚙️' },
]

function isActive(href: string, pathname: string, hash: string) {
  const [hrefPath, hrefHash] = href.split('#')
  if (hrefPath !== pathname) return false
  if (!hrefHash) return hash === '' || hash === '#'
  return hash === `#${hrefHash}`
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hash, setHash] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const update = () => setHash(window.location.hash || '')
    update()
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])

  const activeHref = useMemo(() => {
    const current = NAV_ITEMS.find(i => isActive(i.href, pathname, hash))
    return current?.href ?? '/admin'
  }, [pathname, hash])

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/login')
  }

  const Sidebar = (
    <aside
      className="h-full w-[250px] bg-slate-900 text-white border-r border-slate-800 flex flex-col"
      style={{ width: `${SIDEBAR_WIDTH_PX}px` }}
      aria-label="Admin navigation"
    >
      <div className="px-5 py-5 border-b border-slate-800">
        <Link href="/admin" className="block">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Admin</div>
          <div className="text-lg font-extrabold text-white leading-tight">Party Planner Concierge</div>
        </Link>
      </div>

      <nav className="px-3 py-3 flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = item.href === activeHref
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={[
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
                    active ? 'bg-slate-800/70 text-white' : 'text-slate-200 hover:bg-slate-800/40 hover:text-white',
                  ].join(' ')}
                >
                  <span className="w-5 text-base leading-none" aria-hidden="true">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="px-3 py-3 border-t border-slate-800">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-xl px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800/40 hover:text-white transition-colors text-left"
        >
          Log out
        </button>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:block" style={{ width: `${SIDEBAR_WIDTH_PX}px` }}>
        {Sidebar}
      </div>

      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-40 bg-slate-900 border-b border-slate-800">
        <div className="h-14 px-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800/40"
            aria-label="Open navigation menu"
          >
            ☰
          </button>
          <Link href="/admin" className="font-extrabold text-white">
            Admin
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800/40"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
          />
          <div className="absolute inset-y-0 left-0 shadow-xl">
            <div className="h-full bg-slate-900" style={{ width: `${SIDEBAR_WIDTH_PX}px` }}>
              <div className="h-14 px-4 flex items-center justify-between border-b border-slate-800">
                <div className="font-extrabold text-white">Menu</div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800/40"
                  aria-label="Close navigation menu"
                >
                  ✕
                </button>
              </div>
              {Sidebar}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="md:ml-[250px] px-4 sm:px-6 py-6">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}

