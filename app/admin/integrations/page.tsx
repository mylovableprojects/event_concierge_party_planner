import AdminForm, { type AdminSectionId } from '../AdminForm'
import { getAdminPageContext } from '@/lib/adminPageContext'

const VISIBLE: AdminSectionId[] = [
  'integrations',
  'ghlWebhook',
  'aiApiKey',
  'leadEmailNotifications',
]

export default async function IntegrationsPage() {
  const ctx = await getAdminPageContext()
  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">Integrations</div>
        <div className="mt-1 text-sm text-gray-600">Connect your tools to keep inventory synced and capture leads.</div>
      </div>

      <AdminForm
        config={ctx.config}
        maskedApiKey={ctx.maskedApiKey}
        maskedResendKey={ctx.maskedResendKey}
        inventoryCount={ctx.inventoryCount}
        visibleSections={VISIBLE}
        embedded
        showHeader={false}
        showUpsellBanner={false}
        showSetupChecklist={false}
        showLeadsPanel={false}
        showFooter={false}
        showSaveAndEmbed={false}
      />

      <section className="border border-gray-200 rounded-2xl bg-white p-5 shadow-sm">
        <div className="text-sm font-extrabold text-gray-900">Coming Soon</div>
        <div className="mt-1 text-sm text-gray-600">More integrations are on the way.</div>

        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: 'Go HighLevel', desc: 'Auto-create contacts and opportunities from leads.' },
            { name: 'Zapier', desc: 'Send leads and events to 6,000+ apps.' },
            { name: 'Mailchimp', desc: 'Add leads to audiences and automations.' },
          ].map((c) => (
            <div key={c.name} className="border border-dashed border-gray-300 rounded-2xl p-4 bg-gray-50">
              <div className="flex items-center justify-between gap-3">
                <div className="font-bold text-gray-900 text-sm">{c.name}</div>
                <span className="text-xs font-bold px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-700">Coming soon</span>
              </div>
              <div className="mt-2 text-sm text-gray-600">{c.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

