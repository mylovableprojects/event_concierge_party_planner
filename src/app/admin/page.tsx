import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, COOKIE_NAME } from '@/lib/auth'
import { getCompanyConfig, getInventory, getLeads } from '@/lib/inventory'
import { getAdminIoDashboard } from '@/lib/adminDashboard'
import AdminDashboard from '@/src/components/admin/AdminDashboard'

export default async function AdminDashboardPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) redirect('/login')

  const session = verifySession(token)
  if (!session) redirect('/login')

  const config = await getCompanyConfig(session.companyId)
  if (!config) redirect('/login')
  if (!config.subscriptionActive) redirect('/subscribe')

  const [inventory, leads, io] = await Promise.all([
    getInventory(session.companyId),
    getLeads(session.companyId),
    getAdminIoDashboard(session.companyId),
  ])

  const now = Date.now()
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
  const recentLeads30dCount = leads.filter(l => {
    const t = new Date(l.createdAt).getTime()
    return Number.isFinite(t) && (now - t) <= thirtyDaysMs
  }).length

  return (
    <AdminDashboard
      companyId={session.companyId}
      config={config}
      inventoryCount={inventory.length}
      ioStatus={io.ioStatus}
      ioInventoryCount={io.ioInventoryCount}
      ioCategoriesCount={io.ioCategoriesCount}
      recentLeads30dCount={recentLeads30dCount}
      recentLeads={leads.slice(0, 5)}
    />
  )
}

