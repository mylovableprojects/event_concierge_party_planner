import { getAdminPageContext } from '@/lib/adminPageContext'
import Link from 'next/link'

export default async function SettingsPage() {
  const ctx = await getAdminPageContext()
  const { config } = ctx

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">Account Settings</div>
        <div className="mt-1 text-sm text-gray-600">Your account details and preferences.</div>
      </div>

      {/* Account Info */}
      <section className="border border-gray-200 rounded-2xl bg-white p-5 shadow-sm space-y-4">
        <div className="text-sm font-extrabold text-gray-900">Your Account</div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Name</div>
            <div className="text-sm font-semibold text-gray-900">{config.yourName || '—'}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email</div>
            <div className="text-sm font-semibold text-gray-900">{config.email || '—'}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Phone</div>
            <div className="text-sm font-semibold text-gray-900">{config.phone || '—'}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Company</div>
            <div className="text-sm font-semibold text-gray-900">{config.name || '—'}</div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <Link
            href="/admin/widget-settings"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            Edit company name and branding →
          </Link>
        </div>
      </section>

      {/* Password */}
      <section className="border border-gray-200 rounded-2xl bg-white p-5 shadow-sm space-y-3">
        <div className="text-sm font-extrabold text-gray-900">Password</div>
        <div className="text-sm text-gray-600">Change your login password.</div>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Change password via email →
        </Link>
      </section>

      {/* Danger zone */}
      <section className="border border-red-100 rounded-2xl bg-white p-5 shadow-sm space-y-3">
        <div className="text-sm font-extrabold text-red-700">Need help?</div>
        <div className="text-sm text-gray-600">
          Contact us if you need to change your email address or delete your account.
        </div>
        <a
          href="mailto:support@eventconcierge.ai"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Email support →
        </a>
      </section>
    </div>
  )
}
