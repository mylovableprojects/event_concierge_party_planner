import { cookies } from 'next/headers'
import { getAllCompanyConfigs } from '@/lib/inventory'
import { verifyManageToken, MANAGE_COOKIE } from '@/app/api/manage/login/route'
import ManageClient from './ManageClient'
import LoginForm from './LoginForm'

export default async function ManagePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(MANAGE_COOKIE)?.value
  const authed = !!token && verifyManageToken(token)

  if (!authed) {
    return <LoginForm />
  }

  const companies = await getAllCompanyConfigs()
  const sorted = [...companies].sort((a, b) => a.name.localeCompare(b.name))

  return <ManageClient companies={sorted} />
}
