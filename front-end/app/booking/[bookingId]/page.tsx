import { RequireAuth } from '@/app/providers'
import { BookingDetails } from '@/components/booking-details'

export default async function BookingDetailsPage({
  params,
}: {
  params: Promise<{ bookingId: string }>
}) {
  const { bookingId } = await params
  return (
    <RequireAuth role="customer">
      <BookingDetails bookingId={bookingId} />
    </RequireAuth>
  )
}
