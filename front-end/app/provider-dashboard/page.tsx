import { ProviderPortal } from '@/components/app-pages'
import { RequireAuth } from '@/app/providers'

export default function ProviderDashboardRoute() {
  return (
    <RequireAuth role="provider">
      <ProviderPortal />
    </RequireAuth>
  )
}
