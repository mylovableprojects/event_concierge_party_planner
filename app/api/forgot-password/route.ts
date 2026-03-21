import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { findCompanyByEmail } from '@/lib/inventory'

function generateResetToken(companyId: string, email: string): string {
  const secret = process.env.SESSION_SECRET || 'dev-secret-change-SESSION_SECRET-in-production'
  const exp = Date.now() + 60 * 60 * 1000 // 1 hour
  const payload = Buffer.from(JSON.stringify({ companyId, email, exp })).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export async function POST(request: NextRequest) {
  const { email } = await request.json() as { email: string }

  if (!email) {
    return Response.json({ error: 'Email is required.' }, { status: 400 })
  }

  const config = await findCompanyByEmail(email.trim().toLowerCase())

  // Always return success to avoid email enumeration
  if (!config) {
    return Response.json({ ok: true })
  }

  const token = generateResetToken(config.id, config.email!)
  const resetUrl = `${process.env.APP_URL || 'https://rentalconciergeai.com'}/reset-password?token=${token}`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'hello@updates.rentalconciergeai.com',
      to: config.email,
      subject: 'Reset your Rental Concierge password',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
          <div style="margin-bottom: 32px;">
            <div style="width: 40px; height: 40px; background: #1E2B3C; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
              <span style="color: white; font-size: 20px;">★</span>
            </div>
            <h1 style="font-size: 22px; font-weight: 700; color: #1E2B3C; margin: 0 0 8px;">Reset your password</h1>
            <p style="color: #666; margin: 0;">Click the button below to set a new password for your Rental Concierge account. This link expires in 1 hour.</p>
          </div>
          <a href="${resetUrl}" style="display: inline-block; background: #B03A3A; color: white; font-weight: 600; font-size: 15px; padding: 14px 28px; border-radius: 10px; text-decoration: none; margin-bottom: 24px;">
            Reset Password →
          </a>
          <p style="color: #999; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #bbb; font-size: 12px;">Rental Concierge — a product of The Party Rental Toolkit</p>
        </div>
      `,
    }),
  })

  return Response.json({ ok: true })
}
