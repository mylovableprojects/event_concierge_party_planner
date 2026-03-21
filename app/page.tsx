export default function Home() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,700&family=DM+Sans:wght@400;500;600&display=swap');

        * { box-sizing: border-box; }
        .font-display { font-family: 'Playfair Display', Georgia, serif; }
        body { font-family: 'DM Sans', system-ui, sans-serif; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(176,58,58,0.35); }
          70%  { box-shadow: 0 0 0 14px rgba(176,58,58,0); }
          100% { box-shadow: 0 0 0 0 rgba(176,58,58,0); }
        }
        .fade-1 { animation: fadeUp 0.65s ease both; }
        .fade-2 { animation: fadeUp 0.65s 0.12s ease both; }
        .fade-3 { animation: fadeUp 0.65s 0.24s ease both; }
        .fade-4 { animation: fadeUp 0.65s 0.36s ease both; }
        .fade-5 { animation: fadeUp 0.65s 0.48s ease both; }

        .dot-grid {
          background-image: radial-gradient(circle, rgba(30,43,60,0.12) 1px, transparent 1px);
          background-size: 22px 22px;
        }
        .card-hover {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .card-hover:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 40px rgba(30,43,60,0.12);
        }
        .cta-pulse {
          animation: pulse-ring 2.2s ease-in-out infinite;
        }
        .step-number {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 7rem;
          font-weight: 800;
          line-height: 1;
          color: rgba(30,43,60,0.06);
          position: absolute;
          top: -1.5rem;
          left: -0.5rem;
          user-select: none;
          pointer-events: none;
        }
        .gold-line {
          background: linear-gradient(90deg, transparent, #E8A020, transparent);
          height: 1px;
          width: 100%;
        }
        .badge-glow {
          box-shadow: 0 0 0 4px rgba(232,160,32,0.18);
        }
      `}</style>

      <div className="min-h-screen bg-[#F5F0EA]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

        {/* ── NAV ────────────────────────────────────────────────── */}
        <nav className="sticky top-0 z-40 bg-[#F5F0EA]/90 backdrop-blur-sm border-b border-[#1E2B3C]/8">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#1E2B3C] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <span className="font-semibold text-[#1E2B3C] text-sm tracking-tight">Event Concierge</span>
            </div>
            <a
              href="/signup"
              className="px-4 py-2 rounded-lg bg-[#1E2B3C] text-white text-sm font-semibold hover:bg-[#2a3d55] transition-colors"
            >
              Get started →
            </a>
          </div>
        </nav>

        {/* ── HERO ───────────────────────────────────────────────── */}
        <section className="dot-grid relative overflow-hidden pt-20 pb-24 px-6">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #B03A3A 0%, transparent 70%)', transform: 'translate(40%, -40%)' }} />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-15 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #E8A020 0%, transparent 70%)', transform: 'translate(-40%, 40%)' }} />

          <div className="max-w-3xl mx-auto text-center relative">
            {/* Social proof badge */}
            <div className="fade-1 inline-flex items-center gap-2 bg-white border border-[#E8A020]/40 badge-glow rounded-full px-4 py-1.5 mb-8">
              <span className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="#E8A020"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                ))}
              </span>
              <span className="text-xs font-semibold text-[#1E2B3C]">Trusted by 200+ party rental companies</span>
            </div>

            {/* Headline */}
            <h1 className="fade-2 font-display text-5xl sm:text-6xl md:text-7xl font-bold text-[#1E2B3C] leading-[1.05] tracking-tight mb-6">
              Recommend the{' '}
              <span className="relative inline-block">
                <span style={{ color: '#B03A3A' }}>right rentals.</span>
                <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 300 8" fill="none" preserveAspectRatio="none">
                  <path d="M0 6 Q75 1 150 5 Q225 9 300 4" stroke="#E8A020" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                </svg>
              </span>
              {' '}Every time.
            </h1>

            <p className="fade-3 text-lg sm:text-xl text-gray-600 max-w-xl mx-auto leading-relaxed mb-10">
              Embed an AI chat widget on your website. Customers describe their event — Claude reads your full inventory and presents the perfect rentals as shoppable cards.
            </p>

            {/* CTAs */}
            <div className="fade-4 flex flex-col sm:flex-row gap-3 justify-center mb-10">
              <a
                href="/widget?company=demo"
                target="_blank"
                rel="noopener noreferrer"
                className="cta-pulse px-7 py-3.5 rounded-xl bg-[#B03A3A] text-white font-semibold text-sm hover:bg-[#9a3232] transition-colors"
              >
                Open Widget Demo
              </a>
              <a
                href="/signup"
                className="px-7 py-3.5 rounded-xl bg-[#1E2B3C] text-white font-semibold text-sm hover:bg-[#2a3d55] transition-colors"
              >
                Get Started — $297/yr →
              </a>
            </div>

            {/* Live widget nudge */}
            <div className="fade-5 inline-flex items-center gap-2 bg-white/70 border border-[#1E2B3C]/10 rounded-full px-4 py-2 text-sm text-gray-500">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B03A3A] opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#B03A3A]"></span>
              </span>
              Live demo is running — try the chat bubble in the corner
            </div>
          </div>
        </section>

        <div className="gold-line" />

        {/* ── CART MODES ─────────────────────────────────────────── */}
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-[#B03A3A] text-sm font-semibold tracking-widest uppercase mb-3">Flexible by design</p>
              <h2 className="font-display text-4xl sm:text-5xl font-bold text-[#1E2B3C] leading-tight">
                Works the way <em>you</em> work
              </h2>
              <p className="mt-4 text-gray-500 text-lg max-w-lg mx-auto">
                Three cart modes. One fits your business. Switch any time.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">

              {/* Card 1 — Add to Cart */}
              <div className="card-hover relative bg-white rounded-2xl p-6 shadow-sm border border-[#1E2B3C]/8 flex flex-col">
                {/* Most popular badge */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E8A020] text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full whitespace-nowrap">
                  Most Popular
                </div>
                <div className="w-11 h-11 rounded-xl bg-[#B03A3A]/10 flex items-center justify-center mb-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B03A3A" strokeWidth="2">
                    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.9-1.38l1.56-5.62H6"/>
                  </svg>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-[#B03A3A] text-white text-xs font-bold px-2.5 py-1 rounded-lg w-fit mb-3">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add to Cart
                </div>
                <h3 className="font-semibold text-[#1E2B3C] text-lg mb-2 leading-tight">Your booking software, connected</h3>
                <p className="text-sm text-gray-500 leading-relaxed flex-1">
                  The widget fires a JavaScript event the moment a customer adds an item. Catch it in InflatableOffice, HireHop, or any platform with a custom JS integration.
                </p>
                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E8A020" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span className="text-xs text-gray-400 font-medium">Best for API &amp; software integrations</span>
                </div>
              </div>

              {/* Card 2 — Inquire */}
              <div className="card-hover bg-white rounded-2xl p-6 shadow-sm border border-[#1E2B3C]/8 flex flex-col">
                <div className="w-11 h-11 rounded-xl bg-[#1E2B3C]/8 flex items-center justify-center mb-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E2B3C" strokeWidth="2">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-[#1E2B3C] text-white text-xs font-bold px-2.5 py-1 rounded-lg w-fit mb-3">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Inquire Button
                </div>
                <h3 className="font-semibold text-[#1E2B3C] text-lg mb-2 leading-tight">Drive traffic to your booking page</h3>
                <p className="text-sm text-gray-500 leading-relaxed flex-1">
                  Every recommendation card shows an &quot;Inquire&quot; button that links straight to your existing contact or booking form. Zero technical integration needed.
                </p>
                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E8A020" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span className="text-xs text-gray-400 font-medium">Best for simple websites</span>
                </div>
              </div>

              {/* Card 3 — Browse Only */}
              <div className="card-hover bg-white rounded-2xl p-6 shadow-sm border border-[#1E2B3C]/8 flex flex-col">
                <div className="w-11 h-11 rounded-xl bg-[#E8A020]/12 flex items-center justify-center mb-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8A020" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-[#E8A020] text-white text-xs font-bold px-2.5 py-1 rounded-lg w-fit mb-3">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  Browse Only
                </div>
                <h3 className="font-semibold text-[#1E2B3C] text-lg mb-2 leading-tight">Let the AI do the selling</h3>
                <p className="text-sm text-gray-500 leading-relaxed flex-1">
                  No buttons — just beautiful, AI-curated recommendations. Customers browse, get excited, then call or email you.
                </p>
                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E8A020" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span className="text-xs text-gray-400 font-medium">Best for high-touch businesses</span>
                </div>
              </div>

              {/* Card 4 — Quote List */}
              <div className="card-hover bg-white rounded-2xl p-6 shadow-sm border border-[#1E2B3C]/8 flex flex-col">
                <div className="w-11 h-11 rounded-xl bg-[#B03A3A]/8 flex items-center justify-center mb-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B03A3A" strokeWidth="2">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-[#B03A3A]/15 text-[#B03A3A] text-xs font-bold px-2.5 py-1 rounded-lg w-fit mb-3">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"/></svg>
                  Quote List
                </div>
                <h3 className="font-semibold text-[#1E2B3C] text-lg mb-2 leading-tight">Build a quote inside the chat</h3>
                <p className="text-sm text-gray-500 leading-relaxed flex-1">
                  Customers add items to a quote list as they browse. Their full list — with prices and estimated total — is submitted with their lead form.
                </p>
                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E8A020" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span className="text-xs text-gray-400 font-medium">Best for quote-based businesses</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        <div className="gold-line" />

        {/* ── HOW IT WORKS ───────────────────────────────────────── */}
        <section className="py-24 px-6 bg-[#1E2B3C]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-[#E8A020] text-sm font-semibold tracking-widest uppercase mb-3">Simple setup</p>
              <h2 className="font-display text-4xl sm:text-5xl font-bold text-white leading-tight">
                Live in under 10 minutes
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-8">
              {[
                {
                  n: '01',
                  icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E8A020" strokeWidth="1.8"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
                  title: 'Upload your inventory',
                  desc: 'CSV, plain text, a photo of your price sheet, or type it out item by item. Claude handles the rest.',
                },
                {
                  n: '02',
                  icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E8A020" strokeWidth="1.8"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
                  title: 'Add one script tag',
                  desc: 'Copy a single line of code and paste it before the closing </body> tag on your website.',
                },
                {
                  n: '03',
                  icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E8A020" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
                  title: 'Customers describe their event',
                  desc: 'They type "birthday party for 15 kids, ages 5–8" and Claude instantly matches your inventory to their needs.',
                },
                {
                  n: '04',
                  icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E8A020" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.69A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
                  title: 'Leads flow to your CRM',
                  desc: 'When a customer checks availability, their details and interested items are posted to your Go HighLevel webhook instantly.',
                },
              ].map(({ n, icon, title, desc }) => (
                <div key={n} className="relative bg-white/5 border border-white/10 rounded-2xl p-6 overflow-hidden">
                  <span className="step-number">{n}</span>
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-[#E8A020]/15 flex items-center justify-center mb-4">
                      {icon}
                    </div>
                    <h3 className="font-semibold text-white text-lg mb-2">{title}</h3>
                    <p className="text-sm text-white/55 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="gold-line" />

        {/* ── PRICING ────────────────────────────────────────────── */}
        <section className="py-24 px-6">
          <div className="max-w-lg mx-auto text-center">
            <p className="text-[#B03A3A] text-sm font-semibold tracking-widest uppercase mb-3">Simple pricing</p>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-[#1E2B3C] leading-tight mb-4">
              One plan. Everything included.
            </h2>
            <p className="text-gray-500 text-lg mb-12">No per-conversation fees. No usage caps. Just results.</p>

            <div className="relative bg-white rounded-3xl shadow-xl border border-[#1E2B3C]/10 p-8 text-left">
              {/* Badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#E8A020] text-white text-[10px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-full whitespace-nowrap badge-glow">
                Best value for rental companies
              </div>

              {/* Price */}
              <div className="flex items-end gap-2 mb-1 mt-2">
                <span className="font-display text-6xl font-bold text-[#1E2B3C]">$297</span>
                <span className="text-gray-400 text-lg mb-2">/year</span>
              </div>
              <p className="text-gray-400 text-sm mb-8">That&apos;s less than <strong className="text-[#1E2B3C]">$25/month</strong> — less than one lost rental.</p>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {[
                  'AI chat widget on your website',
                  'Full inventory management',
                  'Lead capture + email notifications',
                  'All 4 cart modes included',
                  'Custom branding & colors',
                  'Go HighLevel / CRM webhook',
                  'Unlimited conversations',
                  'Use your own AI API key',
                ].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-gray-700">
                    <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8A020" strokeWidth="2.5">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="/signup"
                className="cta-pulse block w-full text-center px-8 py-4 rounded-xl bg-[#B03A3A] text-white font-semibold text-base hover:bg-[#9a3232] transition-colors shadow-lg shadow-[#B03A3A]/25"
              >
                Get started — $297/year →
              </a>
              <p className="text-center text-xs text-gray-400 mt-4">Secure payment via Stripe · Cancel anytime</p>
            </div>
          </div>
        </section>

        <div className="gold-line" />

        {/* ── BOTTOM CTA ─────────────────────────────────────────── */}
        <section className="py-24 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-[#1E2B3C] flex items-center justify-center shadow-xl">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-[#1E2B3C] leading-tight mb-5">
              Ready to turn every visitor into a potential booking?
            </h2>
            <p className="text-gray-500 text-lg mb-10 leading-relaxed">
              Set up takes less than 10 minutes. Upload your inventory, grab your embed code, and your AI rental concierge is live.
            </p>
            <a
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#B03A3A] text-white font-semibold text-base hover:bg-[#9a3232] transition-colors shadow-lg shadow-[#B03A3A]/25"
            >
              Get started for $297/year
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
            <p className="mt-5 text-xs text-gray-400">
              Powered by Claude AI · Secure checkout via Stripe · Less than $25/month
            </p>
          </div>
        </section>

      </div>

      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src="/embed.js" data-company="demo" />
    </>
  )
}
