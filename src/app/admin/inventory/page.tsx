import { getAdminPageContext } from '@/lib/adminPageContext'
import AdminForm, { type AdminSectionId } from '@/app/admin/AdminForm'

const VISIBLE: AdminSectionId[] = ['inventory', 'inventoryRules']

export default async function InventoryPage() {
  const ctx = await getAdminPageContext()
  return (
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
    />
  )
}

