import { NextResponse } from 'next/server'

// Auth for /admin is handled by the server component (app/admin/page.tsx)
// using session cookies. No proxy-level logic needed.
export function proxy(_request: NextRequest) {
  return NextResponse.next()
}
