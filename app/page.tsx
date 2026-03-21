export default function Home() {
  return (
    <div className="min-h-screen bg-[#F5F0EA] flex flex-col items-center justify-center px-4 font-sans">
      <div className="max-w-lg w-full text-center space-y-6">

        {/* Logo / icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-3xl bg-[#1E2B3C] flex items-center justify-center shadow-xl">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Event Concierge</h1>
          <p className="text-gray-500 mt-2 text-lg">AI-powered party rental recommendations. Click the chat button to try it live.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/widget?company=demo"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-xl bg-[#B03A3A] text-white font-semibold hover:bg-[#9a3232] transition-colors"
          >
            Open Widget Fullscreen
          </a>
          <a
            href="/admin"
            className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-800 font-semibold hover:bg-gray-50 transition-colors"
          >
            Setup Your Company →
          </a>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left space-y-3">
          <h2 className="font-semibold text-gray-800 text-sm">How it works</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            {[
              ['🎯', 'Customer describes their event in plain English'],
              ['🤖', 'Claude AI reads your full inventory and picks the best matches'],
              ['🛒', 'Recommendations + upsells shown as shoppable product cards'],
              ['📋', 'Clicking Add fires an event your booking software can catch'],
            ].map(([icon, text]) => (
              <li key={text as string} className="flex items-start gap-2">
                <span>{icon}</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-gray-400">
          Powered by Claude AI · Add to any website with one{' '}
          <code className="bg-gray-100 px-1 rounded">&lt;script&gt;</code> tag
        </p>
      </div>

      {/* The embed script loaded on this demo page */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src="/embed.js" data-company="demo" />
    </div>
  )
}
