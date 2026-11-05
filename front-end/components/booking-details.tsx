'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Compass } from 'lucide-react'
import { useAuth } from '@/app/providers'
import { apiUrl, isRecord, parseApiResponse } from '@/lib/api'

type BookingDetailsData = {
  id: string
  booking_reference: string
  booking_date: string
  customer_message: string | null
  agreed_price: string | number | null
  currency: string
  status: string
  service_address: string | null
  district: string | null
  service_id: string
  service_name: string
  service_location: string | null
  provider_id: string
  business_name: string
}

function isBookingDetails(value: unknown): value is BookingDetailsData {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.booking_reference === 'string'
    && typeof value.booking_date === 'string'
    && (value.customer_message === null || typeof value.customer_message === 'string')
    && (value.agreed_price === null || typeof value.agreed_price === 'string' || typeof value.agreed_price === 'number')
    && typeof value.currency === 'string'
    && typeof value.status === 'string'
    && (value.service_address === null || typeof value.service_address === 'string')
    && (value.district === null || typeof value.district === 'string')
    && typeof value.service_id === 'string'
    && typeof value.service_name === 'string'
    && (value.service_location === null || typeof value.service_location === 'string')
    && typeof value.provider_id === 'string'
    && typeof value.business_name === 'string'
}

export function BookingDetails({ bookingId }: { bookingId: string }) {
  const { token } = useAuth()
  const [booking, setBooking] = useState<BookingDetailsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    async function loadBooking() {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(apiUrl(`/api/bookings/${encodeURIComponent(bookingId)}`), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        const payload = await parseApiResponse(response)
        if (!response.ok) {
          throw new Error(isRecord(payload) && typeof payload.message === 'string' ? payload.message : 'Could not load this booking.')
        }
        if (!isRecord(payload) || !isBookingDetails(payload.booking)) {
          throw new Error('The server returned an invalid booking.')
        }
        setBooking(payload.booking)
      } catch (reason) {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'Could not load this booking.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void loadBooking()
    return () => controller.abort()
  }, [bookingId, token])

  return (
      <main className="min-h-screen bg-[#fbfaf7] px-5 pb-24 pt-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#e8e4dd] bg-white p-7 shadow-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#b49a62]">Booking details</p>
          {loading
            ? <p role="status" className="mt-6 text-sm text-[#697586]">Loading booking…</p>
            : error
              ? <div><p role="alert" className="mt-6 text-sm text-[#8a5b55]">{error}</p><Link href="/dashboard" className="mt-5 inline-block text-sm font-semibold text-[#172b4d]">Return to dashboard</Link></div>
              : booking && (
                <>
                  <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h1 className="font-serif text-4xl text-[#172b4d]">{booking.service_name}</h1>
                      <p className="mt-2 text-sm text-[#697586]">{booking.booking_reference}</p>
                    </div>
                    <span className="rounded-full bg-[#f4ead0] px-3 py-1.5 text-xs font-semibold capitalize text-[#816c37]">{booking.status.replaceAll('_', ' ')}</span>
                  </div>
                  <Link href={`/provider/${encodeURIComponent(booking.provider_id)}`} className="mt-5 inline-block text-sm font-semibold text-[#172b4d] hover:underline">
                    {booking.business_name}
                  </Link>
                  <div className="mt-7 grid gap-4 border-t border-[#eeeae3] pt-6 sm:grid-cols-2">
                    <p className="text-sm text-[#536172]"><CalendarDays className="mr-2 inline size-4 text-[#b49a62]" />{new Date(booking.booking_date).toLocaleString()}</p>
                    <p className="text-sm text-[#536172]"><Compass className="mr-2 inline size-4 text-[#b49a62]" />{booking.district || booking.service_address || booking.service_location || 'Location to be arranged'}</p>
                  </div>
                  {booking.agreed_price !== null && <p className="mt-5 text-sm text-[#536172]">Agreed price: {Number(booking.agreed_price).toLocaleString()} {booking.currency}</p>}
                  {booking.customer_message && <div className="mt-6 rounded-xl bg-[#fbfaf7] p-5"><h2 className="font-semibold text-[#172b4d]">Your message</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#536172]">{booking.customer_message}</p></div>}
                  <Link href="/dashboard?view=My%20Bookings" className="mt-7 inline-block rounded-full bg-[#172b4d] px-5 py-3 text-sm font-semibold text-white">
                    View My Bookings
                  </Link>
                </>
              )}
        </div>
      </main>
  )
}
