'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, Star } from 'lucide-react'
import { useAuth } from '@/app/providers'
import { apiUrl, isRecord, parseApiResponse } from '@/lib/api'
import { Footer, Header } from '@/components/site-chrome'

type ProviderProfileData = {
  id: string
  business_name: string
  business_description: string | null
  business_phone: string | null
  business_email: string | null
  business_address: string | null
  district: string | null
  sector: string | null
  average_rating: string | number | null
  total_reviews: string | number | null
}

type ProviderService = {
  id: string
  service_name: string
  description: string | null
  price: string | number | null
  currency: string
  availability_status: string
  location: string | null
  district: string | null
}

function isProvider(value: unknown): value is ProviderProfileData {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.business_name === 'string'
    && ['business_description', 'business_phone', 'business_email', 'business_address', 'district', 'sector']
      .every((key) => value[key] === null || typeof value[key] === 'string')
    && (value.average_rating === null || typeof value.average_rating === 'string' || typeof value.average_rating === 'number')
    && (value.total_reviews === null || typeof value.total_reviews === 'string' || typeof value.total_reviews === 'number')
}

function isProviderService(value: unknown): value is ProviderService {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.service_name === 'string'
    && (value.description === null || typeof value.description === 'string')
    && (value.price === null || typeof value.price === 'string' || typeof value.price === 'number')
    && typeof value.currency === 'string'
    && typeof value.availability_status === 'string'
    && (value.location === null || typeof value.location === 'string')
    && (value.district === null || typeof value.district === 'string')
}

export function ProviderProfile({ providerId }: { providerId: string }) {
  const { token, user } = useAuth()
  const [provider, setProvider] = useState<ProviderProfileData | null>(null)
  const [services, setServices] = useState<ProviderService[]>([])
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [favoriteError, setFavoriteError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    async function loadProvider() {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(apiUrl(`/api/providers/${encodeURIComponent(providerId)}`), { signal: controller.signal })
        const payload = await parseApiResponse(response)
        if (!response.ok) throw new Error(isRecord(payload) && typeof payload.message === 'string' ? payload.message : 'Could not load this provider.')
        if (!isRecord(payload) || !isProvider(payload.provider) || !Array.isArray(payload.services) || !payload.services.every(isProviderService)) {
          throw new Error('The server returned an invalid provider profile.')
        }
        setProvider(payload.provider)
        setServices(payload.services)
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Could not load this provider.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void loadProvider()
    return () => controller.abort()
  }, [providerId])

  useEffect(() => {
    setSaved(false)
    setFavoriteError('')
    if (!token || user?.role !== 'customer') {
      return
    }
    const controller = new AbortController()
    async function checkSaved() {
      try {
        const response = await fetch(apiUrl('/api/favorites/me'), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        const payload = await parseApiResponse(response)
        if (!response.ok) {
          throw new Error(isRecord(payload) && typeof payload.message === 'string'
            ? payload.message
            : 'Could not check saved providers.')
        }
        if (!isRecord(payload) || !Array.isArray(payload.favorites)
          || !payload.favorites.every((favorite) => isRecord(favorite) && typeof favorite.id === 'string')) {
          throw new Error('The server returned an invalid saved providers response.')
        }
        setSaved(payload.favorites.some((favorite) => isRecord(favorite) && favorite.id === providerId))
        setFavoriteError('')
      } catch (reason) {
        if (!controller.signal.aborted) {
          setFavoriteError(reason instanceof Error ? reason.message : 'Could not check saved providers.')
        }
      }
    }
    void checkSaved()
    return () => controller.abort()
  }, [providerId, token, user?.role])

  async function toggleSaved() {
    if (!token || user?.role !== 'customer' || saving) return
    setSaving(true)
    setError('')
    try {
      const response = await fetch(apiUrl(saved
        ? `/api/favorites/${encodeURIComponent(providerId)}`
        : '/api/favorites'), {
        method: saved ? 'DELETE' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(saved ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(!saved ? { body: JSON.stringify({ provider_id: providerId }) } : {}),
      })
      const payload = await parseApiResponse(response)
      if (!response.ok) throw new Error(isRecord(payload) && typeof payload.message === 'string' ? payload.message : 'Could not update saved providers.')
      setSaved(!saved)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update saved providers.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#fbfaf7] px-5 pb-24 pt-32">
        <div className="mx-auto max-w-5xl">
          {loading
            ? <p role="status" className="rounded-2xl bg-white p-10 text-center text-sm text-[#697586]">Loading provider profile…</p>
            : error && !provider
              ? <div className="rounded-2xl bg-white p-10 text-center"><p role="alert" className="text-sm text-[#8a5b55]">{error}</p><Link href="/services" className="mt-5 inline-block text-sm font-semibold text-[#172b4d]">Explore services</Link></div>
              : provider && (
                <>
                  <section className="rounded-3xl bg-[#172b4d] p-7 text-white sm:p-10">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="font-serif text-4xl">{provider.business_name}</h1>
                      <BadgeCheck aria-label="Verified provider" className="size-5 text-[#e3c982]" />
                    </div>
                    <p className="mt-3 text-sm text-white/75">{[provider.district, provider.sector, provider.business_address].filter(Boolean).join(' · ') || 'Location not provided'}</p>
                    {provider.average_rating !== null && (
                      <p className="mt-4 flex items-center gap-2 text-sm">
                        <Star className="size-4 fill-[#e3c982] text-[#e3c982]" />{provider.average_rating}
                        {provider.total_reviews !== null && <span className="text-white/70">({provider.total_reviews} reviews)</span>}
                      </p>
                    )}
                    <div className="mt-6 flex flex-wrap gap-3">
                      {user?.role === 'customer' && (
                        <button type="button" disabled={saving} onClick={() => void toggleSaved()} className="rounded-full border border-white/50 px-5 py-3 text-sm font-semibold disabled:opacity-60">
                          {saving ? 'Saving…' : saved ? 'Remove from saved' : 'Save provider'}
                        </button>
                      )}
                      {services[0] && <Link href={`/booking?serviceId=${encodeURIComponent(services[0].id)}`} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#172b4d]">Request a service <ArrowRight className="ml-1 inline size-4" /></Link>}
                    </div>
                  </section>
                  {error && <p role="alert" className="mt-4 text-sm text-[#8a5b55]">{error}</p>}
                  {favoriteError && <p role="alert" className="mt-4 text-sm text-[#8a5b55]">{favoriteError}</p>}
                  {provider.business_description && <p className="mt-8 leading-7 text-[#536172]">{provider.business_description}</p>}
                  <section className="mt-10">
                    <h2 className="font-serif text-3xl text-[#172b4d]">Services</h2>
                    {services.length
                      ? <div className="mt-5 grid gap-4 sm:grid-cols-2">{services.map((service) => (
                        <article key={service.id} className="rounded-2xl border border-[#e8e4dd] bg-white p-5">
                          <h3 className="font-serif text-xl text-[#172b4d]">{service.service_name}</h3>
                          {service.description && <p className="mt-2 text-sm leading-6 text-[#536172]">{service.description}</p>}
                          <p className="mt-4 text-sm text-[#697586]">{service.price === null ? 'Price available on request' : `${Number(service.price).toLocaleString()} ${service.currency}`}</p>
                          <Link href={`/booking?serviceId=${encodeURIComponent(service.id)}`} className="mt-4 inline-block text-sm font-semibold text-[#172b4d]">Request this service <ArrowRight className="ml-1 inline size-4" /></Link>
                        </article>
                      ))}</div>
                      : <p className="mt-4 text-sm text-[#697586]">This provider has no published services yet.</p>}
                  </section>
                </>
              )}
        </div>
      </main>
      <Footer />
    </>
  )
}
