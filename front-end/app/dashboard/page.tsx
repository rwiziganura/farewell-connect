import { CustomerDashboard } from '@/components/customer-dashboard'
import { RequireAuth } from '@/app/providers'

export default function CustomerDashboardRoute() {
  return (
    <RequireAuth role="customer">
      <CustomerDashboard />
    </RequireAuth>
  )
}
