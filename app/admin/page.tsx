import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySession, COOKIE_NAME } from '@/lib/auth'
import { getCompanyConfig, getInventory } from '@/lib/inventory'
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
  if (!config.subscriptionActive) redirect('/subscribe')

  let maskedApiKey: string | undefined
  if (config.encryptedApiKey) {
    try { maskedApiKey = maskApiKey(decrypt(config.encryptedApiKey)) } catch { /* ignore */ }
  }

  let maskedResendKey: string | undefined
  if (config.encryptedResendKey) {
    try { maskedResendKey = maskApiKey(decrypt(config.encryptedResendKey)) } catch { /* ignore */ }
  }

  const inventoryCount = getInventory(session.companyId).length

  return <AdminForm config={config} maskedApiKey={maskedApiKey} maskedResendKey={maskedResendKey} inventoryCount={inventoryCount} />
}
