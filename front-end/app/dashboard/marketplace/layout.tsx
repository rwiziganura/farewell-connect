import type { ReactNode } from 'react'
import { CustomerWorkspace } from '@/components/customer-workspace'

export default function CustomerMarketplaceLayout({ children }: { children: ReactNode }) {
  return <CustomerWorkspace>{children}</CustomerWorkspace>
}
