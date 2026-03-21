import { Resend } from 'resend'

/** Validate a Resend API key by listing API keys (lightweight call). */
export async function validateResendKey(apiKey: string): Promise<void> {
  const res = await fetch('https://api.resend.com/api-keys', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (res.status === 401 || res.status === 403) {
    throw new Error('Invalid Resend API key')
  }
  if (!res.ok) {
    throw new Error(`Resend API returned ${res.status}`)
  }
}

interface LeadEmailParams {
  apiKey: string
  toEmail: string
  companyName: string
  firstName: string
  phone: string
  email?: string
  eventDate?: string
  eventDescription: string
  interestedItems: Array<{ name: string; price: number }>
  estimatedValue: number
}

export async function sendLeadEmail(params: LeadEmailParams): Promise<void> {
  const {
    apiKey, toEmail, companyName, firstName, phone, email,
    eventDate, eventDescription, interestedItems, estimatedValue,
  } = params

  const resend = new Resend(apiKey)

  const itemRows = interestedItems.length > 0
    ? interestedItems.map(i =>
        `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;">${i.name}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;text-align:right;font-weight:600;">$${i.price}</td>
        </tr>`
      ).join('')
    : `<tr><td colspan="2" style="padding:8px 12px;font-size:13px;color:#9ca3af;">No items selected</td></tr>`

  const totalRow = interestedItems.length > 0
    ? `<tr>
        <td style="padding:8px 12px;font-size:13px;font-weight:700;color:#1e2b3c;">Estimated Total</td>
        <td style="padding:8px 12px;font-size:14px;font-weight:700;color:#B03A3A;text-align:right;">$${estimatedValue.toLocaleString()}</td>
      </tr>`
    : ''

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f0ea;font-family:system-ui,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

    <div style="background:#1E2B3C;padding:24px 28px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:#E8A020;text-transform:uppercase;margin-bottom:6px;">${companyName}</div>
      <div style="font-size:20px;font-weight:700;color:#ffffff;">New Lead from Your Widget</div>
    </div>

    <div style="padding:24px 28px;border-bottom:1px solid #f0f0f0;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:#9ca3af;text-transform:uppercase;margin-bottom:12px;">Contact Info</div>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;width:120px;">Name</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#111827;">${firstName}</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Phone</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#111827;">${phone}</td></tr>
        ${email ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Email</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#111827;">${email}</td></tr>` : ''}
        ${eventDate ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Event Date</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:#111827;">${eventDate}</td></tr>` : ''}
      </table>
    </div>

    ${eventDescription ? `
    <div style="padding:20px 28px;border-bottom:1px solid #f0f0f0;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:#9ca3af;text-transform:uppercase;margin-bottom:8px;">Event Description</div>
      <div style="font-size:13px;color:#374151;line-height:1.6;">${eventDescription}</div>
    </div>` : ''}

    <div style="padding:20px 28px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:#9ca3af;text-transform:uppercase;margin-bottom:10px;">Interested Items</div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;">
        ${itemRows}
        ${totalRow}
      </table>
    </div>

    <div style="padding:16px 28px;background:#f9fafb;border-top:1px solid #f0f0f0;">
      <div style="font-size:11px;color:#9ca3af;">Sent by Event Concierge · Reply to this email or call ${firstName} directly.</div>
    </div>

  </div>
</body>
</html>`

  await resend.emails.send({
    from: 'Event Concierge Leads <onboarding@resend.dev>',
    to: toEmail,
    subject: `New lead from ${firstName} — ${companyName} widget`,
    html,
  })
}
