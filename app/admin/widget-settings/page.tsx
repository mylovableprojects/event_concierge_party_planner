import AdminForm, { type AdminSectionId } from '../AdminForm'
import { getAdminPageContext } from '@/lib/adminPageContext'

const VISIBLE: AdminSectionId[] = [
  'company',
  'brandColors',
  'cartMode',
  'customAiInstructions',
]

export default async function WidgetSettingsPage() {
  const ctx = await getAdminPageContext()
  return (
    <AdminForm
      config={ctx.config}
      maskedApiKey={ctx.maskedApiKey}
      maskedResendKey={ctx.maskedResendKey}
      inventoryCount={ctx.inventoryCount}
      visibleSections={VISIBLE}
      embedded
      showHeader
      headerTitle="Widget Settings"
      headerSubtitle="Configure your AI chat widget’s look, behavior, and responses."
      showUpsellBanner
      showSetupChecklist={false}
      showLeadsPanel={false}
      showFooter={false}
    />
  )
}

