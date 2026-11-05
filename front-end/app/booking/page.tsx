import { BookingRequest } from '@/components/booking-request'
import { RequireAuth } from '@/app/providers'

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
    <RequireAuth role="customer" loginRedirectTo={`/login?redirectTo=${encodeURIComponent(requestedPath)}`}>
      <BookingRequest initialServiceId={serviceId} />
    </RequireAuth>
  )
}
