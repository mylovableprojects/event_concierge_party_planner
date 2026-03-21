import { cookies } from 'next/headers'
import { verifySession, COOKIE_NAME } from '@/lib/auth'
import { getLeads } from '@/lib/inventory'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const session = verifySession(token)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const leads = await getLeads(session.companyId)
    return Response.json({ leads })
  } catch (err) {
    console.error('GET leads error:', err)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
