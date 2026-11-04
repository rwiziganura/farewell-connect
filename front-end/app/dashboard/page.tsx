import { CustomerDashboard } from '@/components/app-pages'
import { RequireAuth } from '@/app/providers'

export default function CustomerDashboardRoute() {
  return (
    <RequireAuth role="customer">
      <CustomerDashboard />
    </RequireAuth>
  )
}
