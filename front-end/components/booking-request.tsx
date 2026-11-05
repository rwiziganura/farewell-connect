'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, CalendarDays } from 'lucide-react'
import { useAuth } from '@/app/providers'
import { apiUrl, isRecord, parseApiResponse } from '@/lib/api'
import { Footer, Header } from '@/components/site-chrome'

type ServiceOption = {
  id: string
  service_name: string
  provider_id: string
  business_name: string
  location: string | null
  district: string | null
  availability_status: string
}

function isServiceOption(value: unknown): value is ServiceOption {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.service_name === 'string'
    && typeof value.provider_id === 'string'
    && typeof value.business_name === 'string'
    && (value.location === null || typeof value.location === 'string')
    && (value.district === null || typeof value.district === 'string')
    && typeof value.availability_status === 'string'
}

function messageFrom(payload: unknown, fallback: string) {
  return isRecord(payload) && typeof payload.message === 'string' ? payload.message : fallback
}

function localDateTimeInputMin() {
  const minDate = new Date(Date.now() + 60_000)
  minDate.setMinutes(minDate.getMinutes() - minDate.getTimezoneOffset())
  return minDate.toISOString().slice(0, 16)
}

export function BookingRequest({ initialServiceId = '' }: { initialServiceId?: string }) {
  const { token } = useAuth()
  const router = useRouter()
  const [services, setServices] = useState<ServiceOption[]>([])
  const [serviceId, setServiceId] = useState(initialServiceId)
  const [bookingDate, setBookingDate] = useState('')
  const [address, setAddress] = useState('')
  const [district, setDistrict] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    async function loadServices() {
      setLoading(true)
      setError('')
      try {
        const path = initialServiceId
          ? `/api/services/${encodeURIComponent(initialServiceId)}`
          : '/api/services?limit=50'
        const response = await fetch(apiUrl(path), { signal: controller.signal })
        const payload = await parseApiResponse(response)
        if (!response.ok) throw new Error(messageFrom(payload, 'Could not load available services.'))

        if (initialServiceId) {
          if (!isRecord(payload) || !isServiceOption(payload.service)) {
            throw new Error('The server returned an invalid service.')
          }
          setServices([payload.service])
        } else {
          if (!isRecord(payload) || !Array.isArray(payload.services) || !payload.services.every(isServiceOption)) {
            throw new Error('The server returned an invalid services list.')
          }
          setServices(payload.services)
        }
      } catch (reason) {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'Could not load available services.')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void loadServices()
    return () => controller.abort()
  }, [initialServiceId])

  useEffect(() => {
    if (initialServiceId) setServiceId(initialServiceId)
  }, [initialServiceId])

  const selectedService = services.find((service) => service.id === serviceId)

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !selectedService || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch(apiUrl('/api/bookings'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: selectedService.id,
          booking_date: new Date(bookingDate).toISOString(),
          customer_message: message.trim() || null,
          service_address: address.trim() || null,
          district: district.trim() || null,
        }),
      })
      const payload = await parseApiResponse(response)
      if (!response.ok) throw new Error(messageFrom(payload, 'Could not submit your booking request.'))
      if (!isRecord(payload) || !isRecord(payload.booking) || typeof payload.booking.id !== 'string') {
        throw new Error('The server returned an invalid booking response.')
      }
      router.replace(`/booking/${encodeURIComponent(payload.booking.id)}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not submit your booking request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f5f0e8] px-5 pb-24 pt-32">
        <form onSubmit={submitRequest} className="mx-auto max-w-3xl rounded-3xl bg-white p-7 shadow-xl sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#b49a62]">Booking request</p>
          <h1 className="mt-3 font-serif text-4xl text-[#172b4d]">Request a service.</h1>
          <p className="mt-3 leading-7 text-[#697586]">Your request will be sent to the selected provider and remain pending until they respond.</p>

          {loading
            ? <p role="status" className="mt-8 text-sm text-[#697586]">Loading available services…</p>
            : error && services.length === 0
              ? <p role="alert" className="mt-8 text-sm text-[#8a5b55]">{error}</p>
              : (
                <div className="mt-8 grid gap-5">
                  <label className="field">
                    Service
                    <select
                      value={serviceId}
                      onChange={(event) => setServiceId(event.target.value)}
                      required
                      disabled={Boolean(initialServiceId)}
                    >
                      <option value="">Choose a service</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.service_name} — {service.business_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedService && (
                    <div className="rounded-xl bg-[#fbfaf7] p-4 text-sm text-[#536172]">
                      <p className="font-semibold text-[#172b4d]">{selectedService.service_name}</p>
                      <p className="mt-1">{selectedService.business_name}</p>
                      {selectedService.availability_status !== 'available' && (
                        <p role="alert" className="mt-2 text-[#8a5b55]">This service is not currently available for booking.</p>
                      )}
                    </div>
                  )}
                  <label className="field">
                    Preferred date and time
                    <span className="flex items-center gap-2 rounded-xl border border-[#ded9d0] px-3">
                      <CalendarDays className="size-4 text-[#b49a62]" />
                      <input type="datetime-local" value={bookingDate} onChange={(event) => setBookingDate(event.target.value)} required min={localDateTimeInputMin()} />
                    </span>
                  </label>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="field">District<input value={district} onChange={(event) => setDistrict(event.target.value)} maxLength={100} /></label>
                    <label className="field">Service address<input value={address} onChange={(event) => setAddress(event.target.value)} maxLength={255} /></label>
                  </div>
                  <label className="field">
                    Additional requirements (optional)
                    <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={5000} className="min-h-28" />
                  </label>
                </div>
              )}

          {error && services.length > 0 && <p role="alert" className="mt-5 text-sm text-[#8a5b55]">{error}</p>}
          {!loading && services.length === 0 && !error && <p className="mt-8 text-sm text-[#697586]">No services are available to request right now.</p>}

          <div className="mt-8 flex flex-wrap justify-between gap-3">
            <Link href="/services" className="inline-flex items-center gap-2 rounded-full border border-[#d9cfbd] px-5 py-3 text-sm font-semibold text-[#172b4d]">
              <ArrowLeft className="size-4" />Back to services
            </Link>
            <button type="submit" disabled={loading || submitting || !selectedService || selectedService.availability_status !== 'available' || !bookingDate} className="rounded-full bg-[#172b4d] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? 'Submitting…' : <>Submit request <ArrowRight className="ml-2 inline size-4" /></>}
            </button>
          </div>
        </form>
      </main>
      <Footer />
    </>
  )
}
