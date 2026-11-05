import { BookingRequest } from '@/components/booking-request'
import { CustomerWorkspace } from '@/components/customer-workspace'

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ serviceId?: string }>
}) {
  const { serviceId } = await searchParams
  const requestedPath = serviceId
    ? `/booking?serviceId=${encodeURIComponent(serviceId)}`
    : '/booking'
  return (
    <CustomerWorkspace loginRedirectTo={`/login?redirectTo=${encodeURIComponent(requestedPath)}`}>
      <BookingRequest initialServiceId={serviceId} />
    </CustomerWorkspace>
  )
}
