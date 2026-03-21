import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, COOKIE_NAME } from '@/lib/auth'
import { getCompanyConfig } from '@/lib/inventory'
import AdminForm from './AdminForm'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) redirect('/login')

  const session = verifySession(token)
  if (!session) redirect('/login')

  const config = getCompanyConfig(session.companyId)
  if (!config) redirect('/login')

  return <AdminForm config={config} />
}
