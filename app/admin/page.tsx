import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, COOKIE_NAME } from '@/lib/auth'
import { getCompanyConfig } from '@/lib/inventory'
import { decrypt, maskApiKey } from '@/lib/encryption'
import AdminForm from './AdminForm'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) redirect('/login')

  const session = verifySession(token)
  if (!session) redirect('/login')

  const config = getCompanyConfig(session.companyId)
  if (!config) redirect('/login')

  let maskedApiKey: string | undefined
  if (config.encryptedApiKey) {
    try {
      maskedApiKey = maskApiKey(decrypt(config.encryptedApiKey))
    } catch {
      maskedApiKey = undefined
    }
  }

  return <AdminForm config={config} maskedApiKey={maskedApiKey} />
}
