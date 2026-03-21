export default async function SignupSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>
}) {
  const { company: companyId } = await searchParams

  if (!companyId) {
    return (
      <div className="min-h-screen bg-[#F5F0EA] flex items-center justify-center">
        <p className="text-gray-500">Invalid signup link.</p>
      </div>
    )
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://yourapp.vercel.app'
  const embedCode = `<script src="${origin}/embed.js" data-company="${companyId}"></script>`
  const adminUrl = `/admin`

  return (
    <div className="min-h-screen bg-[#F5F0EA] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg space-y-6">

        {/* Success header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">You&apos;re all set!</h1>
          <p className="text-gray-500 mt-2">Your AI rental concierge is ready to go.</p>
        </div>

        {/* Embed code */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#1E2B3C] flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
              </svg>
            </div>
            <h2 className="font-semibold text-gray-900">Your embed code</h2>
          </div>
          <p className="text-sm text-gray-500">
            Paste this before the <code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code> tag on any page of your website.
          </p>
          <div className="bg-gray-950 rounded-xl px-4 py-3 flex items-start gap-3">
            <code className="text-green-400 text-xs flex-1 break-all leading-relaxed">{embedCode}</code>
            <button
              id="copy-btn"
              className="text-gray-400 hover:text-white shrink-0 transition-colors mt-0.5"
              title="Copy"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-400">Company ID: <code className="bg-gray-100 px-1 rounded font-mono">{companyId}</code></p>
        </div>

        {/* Next steps */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Next steps</h2>
          <div className="space-y-3">
            {[
              {
                n: '1',
                title: 'Upload your inventory',
                desc: 'Add your rental items via CSV, photo, plain text, or one-by-one in the admin panel.',
                href: adminUrl,
                cta: 'Go to Admin Panel →',
                primary: true,
              },
              {
                n: '2',
                title: 'Customize your widget',
                desc: 'Set your brand colors, cart mode, and lead capture webhook.',
                href: adminUrl,
                cta: 'Open Settings →',
                primary: false,
              },
              {
                n: '3',
                title: 'Add the embed code to your site',
                desc: 'Paste the script tag above into your website. The chat bubble appears instantly.',
                href: null,
                cta: null,
                primary: false,
              },
            ].map(step => (
              <div key={step.n} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-[#1E2B3C] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {step.n}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-800">{step.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{step.desc}</div>
                  {step.href && step.cta && (
                    <a
                      href={step.href}
                      className={`inline-block mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                        step.primary
                          ? 'bg-[#B03A3A] text-white hover:bg-[#9a3232]'
                          : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {step.cta}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <a href={adminUrl} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1E2B3C] text-white font-semibold text-sm hover:bg-[#2a3d55] transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            Open Admin Panel
          </a>
        </div>

      </div>

      {/* Copy-to-clipboard script */}
      <script dangerouslySetInnerHTML={{ __html: `
        document.getElementById('copy-btn')?.addEventListener('click', function() {
          navigator.clipboard.writeText(${JSON.stringify(embedCode)}).then(() => {
            this.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>';
            setTimeout(() => { this.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x=\\"9\\" y=\\"9\\" width=\\"13\\" height=\\"13\\" rx=\\"2\\"/><path d=\\"M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1\\"/></svg>'; }, 2000);
          });
        });
      `}} />
    </div>
  )
}
