import AdminForm, { type AdminSectionId } from '../AdminForm'
import { getAdminPageContext } from '@/lib/adminPageContext'

const VISIBLE: AdminSectionId[] = ['leads']

export default async function LeadsPage() {
  const ctx = await getAdminPageContext()
  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">Leads</div>
        <div className="mt-1 text-sm text-gray-600">Review and export recent lead submissions.</div>
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
        showLeadsPanel
        showFooter={false}
        showSaveAndEmbed={false}
      />
    </div>
  )
}

