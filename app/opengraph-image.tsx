import { ImageResponse } from 'next/og'

export const alt = 'Event Concierge — AI Chat Widget for Party Rental Companies'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#F5F0EA',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Georgia, serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background blobs */}
        <div style={{
          position: 'absolute', top: -120, right: -120,
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(176,58,58,0.18) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: -80,
          width: 360, height: 360, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,160,32,0.15) 0%, transparent 70%)',
        }} />

        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(30,43,60,0.1) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: '#1E2B3C',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <span style={{ fontSize: 28, fontWeight: 600, color: '#1E2B3C', letterSpacing: '-0.5px' }}>
            Event Concierge
          </span>
        </div>

        {/* Headline */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          fontSize: 72, fontWeight: 800, color: '#1E2B3C',
          lineHeight: 1.05, textAlign: 'center', letterSpacing: '-2px',
        }}>
          <span>Recommend the</span>
          <span style={{ color: '#B03A3A' }}>right rentals.</span>
          <span>Every time.</span>
        </div>

        {/* Subheadline */}
        <div style={{
          fontSize: 24, color: '#6b7280', textAlign: 'center',
          maxWidth: 700, marginTop: 24, lineHeight: 1.5,
          fontFamily: 'system-ui, sans-serif', fontWeight: 400,
        }}>
          AI chat widget for party rental companies. Embed in 60 seconds. $297/year.
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 12, marginTop: 36 }}>
          {['Add to Cart', 'Inquire Button', 'Quote List', 'Browse Only'].map(label => (
            <div key={label} style={{
              background: 'white', border: '1.5px solid rgba(30,43,60,0.12)',
              borderRadius: 100, padding: '8px 18px',
              fontSize: 16, fontWeight: 600, color: '#1E2B3C',
              fontFamily: 'system-ui, sans-serif',
              boxShadow: '0 2px 8px rgba(30,43,60,0.08)',
            }}>
              {label}
            </div>
          ))}
        </div>

        {/* Bottom gradient bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 6, background: 'linear-gradient(90deg, #B03A3A, #E8A020, #1E2B3C)',
        }} />
      </div>
    ),
    { ...size }
  )
}
