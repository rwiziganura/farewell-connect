import { BookingDetails } from '@/components/booking-details'
import { CustomerWorkspace } from '@/components/customer-workspace'

export default async function BookingDetailsPage({
  params,
}: {
  params: Promise<{ bookingId: string }>
}) {
  const { bookingId } = await params
  const requestedPath = `/booking/${encodeURIComponent(bookingId)}`
  return (
    <CustomerWorkspace loginRedirectTo={`/login?redirectTo=${encodeURIComponent(requestedPath)}`}>
      <BookingDetails bookingId={bookingId} />
    </CustomerWorkspace>
  )
}
