import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const user = process.env.ADMIN_USER
  const pass = process.env.ADMIN_PASS

  if (!user || !pass) {
    // Env vars not set — block access rather than leave it open
    return new Response('Admin access is not configured.', { status: 503 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ')
    if (scheme === 'Basic' && encoded) {
      const decoded = atob(encoded)
      const colon = decoded.indexOf(':')
      const providedUser = decoded.slice(0, colon)
      const providedPass = decoded.slice(colon + 1)
      if (providedUser === user && providedPass === pass) {
        return undefined // allow through
      }
    }
  }

  return new Response('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
  })
}

export const config = {
  matcher: '/admin/:path*',
}
