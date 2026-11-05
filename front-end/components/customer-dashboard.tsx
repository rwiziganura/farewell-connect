'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarDays,
  Compass,
  HeartHandshake,
  LogOut,
  Search,
  UserRound,
} from 'lucide-react'
import { AccountSettings } from '@/components/account-settings'
import { useAuth } from '@/app/providers'
import { apiUrl, isRecord, parseApiResponse } from '@/lib/api'

type FavoriteProvider = {
  id: string
  business_name: string
  business_description: string | null
  business_address: string | null
  district: string | null
  sector: string | null
  average_rating: string | number | null
  total_reviews: string | number | null
}

type CustomerBooking = {
  id: string
  booking_reference: string
  booking_date: string
  status: string
  service_address: string | null
  district: string | null
  service_id: string
  service_name: string
  service_location: string | null
  provider_id: string
  business_name: string
}

function isFavoriteProvider(value: unknown): value is FavoriteProvider {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.business_name === 'string'
    && (value.business_description === null || typeof value.business_description === 'string')
    && (value.business_address === null || typeof value.business_address === 'string')
    && (value.district === null || typeof value.district === 'string')
    && (value.sector === null || typeof value.sector === 'string')
    && (value.average_rating === null || typeof value.average_rating === 'number' || typeof value.average_rating === 'string')
    && (value.total_reviews === null || typeof value.total_reviews === 'number' || typeof value.total_reviews === 'string')
}

function isCustomerBooking(value: unknown): value is CustomerBooking {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.booking_reference === 'string'
    && typeof value.booking_date === 'string'
    && typeof value.status === 'string'
    && (value.service_address === null || typeof value.service_address === 'string')
    && (value.district === null || typeof value.district === 'string')
    && typeof value.service_id === 'string'
    && typeof value.service_name === 'string'
    && (value.service_location === null || typeof value.service_location === 'string')
    && typeof value.provider_id === 'string'
    && typeof value.business_name === 'string'
}

async function responseError(response: Response, fallback: string) {
  const payload = await parseApiResponse(response)
  return isRecord(payload) && typeof payload.message === 'string' ? payload.message : fallback
}

export function CustomerDashboard() {
  const { token, user, logout } = useAuth()
  const [view, setView] = useState('Overview')
  const [favorites, setFavorites] = useState<FavoriteProvider[]>([])
  const [bookings, setBookings] = useState<CustomerBooking[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(true)
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [favoritesError, setFavoritesError] = useState('')
  const [bookingsError, setBookingsError] = useState('')
  const [removingId, setRemovingId] = useState('')

  useEffect(() => {
    const requestedView = new URLSearchParams(window.location.search).get('view')
    if (['Overview', 'Find Services', 'My Bookings', 'Saved Providers', 'Account Settings'].includes(requestedView ?? '')) {
      setView(requestedView ?? 'Overview')
    }
  }, [])

  const loadFavorites = useCallback(async () => {
    if (!token) return
    setLoadingFavorites(true)
    setFavoritesError('')
    try {
      const response = await fetch(apiUrl('/api/favorites/me'), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error(await responseError(response, 'Could not load saved providers.'))
      const payload = await parseApiResponse(response)
      if (!isRecord(payload) || !Array.isArray(payload.favorites) || !payload.favorites.every(isFavoriteProvider)) {
        throw new Error('The server returned an invalid saved providers response.')
      }
      setFavorites(payload.favorites)
    } catch (reason) {
      setFavoritesError(reason instanceof Error ? reason.message : 'Could not load saved providers.')
    } finally {
      setLoadingFavorites(false)
    }
  }, [token])

  const loadBookings = useCallback(async () => {
    if (!token) return
    setLoadingBookings(true)
    setBookingsError('')
    try {
      const response = await fetch(apiUrl('/api/bookings/my'), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error(await responseError(response, 'Could not load your bookings.'))
      const payload = await parseApiResponse(response)
      if (!isRecord(payload) || !Array.isArray(payload.bookings) || !payload.bookings.every(isCustomerBooking)) {
        throw new Error('The server returned an invalid bookings response.')
      }
      setBookings(payload.bookings)
    } catch (reason) {
      setBookingsError(reason instanceof Error ? reason.message : 'Could not load your bookings.')
    } finally {
      setLoadingBookings(false)
    }
  }, [token])

  useEffect(() => {
    setFavorites([])
    setBookings([])
    void loadFavorites()
    void loadBookings()
  }, [loadBookings, loadFavorites])

  async function removeFavorite(providerId: string) {
    if (!token || removingId) return
    setRemovingId(providerId)
    setFavoritesError('')
    try {
      const response = await fetch(apiUrl(`/api/favorites/${encodeURIComponent(providerId)}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error(await responseError(response, 'Could not remove this provider.'))
      await loadFavorites()
    } catch (reason) {
      setFavoritesError(reason instanceof Error ? reason.message : 'Could not remove this provider.')
    } finally {
      setRemovingId('')
    }
  }

  const nav = [
    ['Overview', Compass],
    ['Find Services', Search],
    ['My Bookings', CalendarDays],
    ['Saved Providers', HeartHandshake],
    ['Account Settings', UserRound],
  ] as const

  const bookingCards = (items: CustomerBooking[]) => items.map((booking) => (
    <article key={booking.id} className="rounded-2xl border border-[#e8e4dd] bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs text-[#697586]">{booking.booking_reference}</p>
          <h3 className="mt-1 font-serif text-2xl text-[#172b4d]">{booking.service_name}</h3>
          <Link href={`/provider/${encodeURIComponent(booking.provider_id)}`} className="mt-2 inline-block text-sm text-[#536172] hover:underline">
            {booking.business_name}
          </Link>
        </div>
        <span className="w-fit rounded-full bg-[#f4ead0] px-3 py-1.5 text-xs font-semibold capitalize text-[#816c37]">
          {booking.status.replaceAll('_', ' ')}
        </span>
      </div>
      <div className="mt-5 grid gap-3 border-t border-[#eeeae3] pt-4 text-sm text-[#536172] sm:grid-cols-2">
        <p><CalendarDays className="mr-2 inline size-4 text-[#b49a62]" />{new Date(booking.booking_date).toLocaleString()}</p>
        <p><Compass className="mr-2 inline size-4 text-[#b49a62]" />{booking.district || booking.service_address || booking.service_location || 'Location to be arranged'}</p>
      </div>
      <Link href={`/booking/${encodeURIComponent(booking.id)}`} className="mt-5 inline-block rounded-full border border-[#d9cfbd] px-4 py-2 text-xs font-semibold text-[#172b4d]">
        View details
      </Link>
    </article>
  ))

  const favoriteCards = favorites.map((provider) => (
    <article key={provider.id} className="rounded-2xl border border-[#e8e4dd] bg-white p-5 shadow-sm">
      <Link href={`/provider/${encodeURIComponent(provider.id)}`} className="font-serif text-xl text-[#172b4d] hover:underline">
        {provider.business_name}
      </Link>
      <p className="mt-2 text-sm text-[#697586]">
        {[provider.district, provider.sector, provider.business_address].filter(Boolean).join(' · ') || 'Location not provided'}
      </p>
      {provider.business_description && <p className="mt-3 text-sm leading-6 text-[#536172]">{provider.business_description}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={`/provider/${encodeURIComponent(provider.id)}`} className="rounded-full bg-[#172b4d] px-4 py-2 text-xs font-semibold text-white">
          View provider
        </Link>
        <button
          type="button"
          disabled={removingId === provider.id}
          onClick={() => void removeFavorite(provider.id)}
          className="rounded-full border border-[#d9cfbd] px-4 py-2 text-xs font-semibold text-[#172b4d] disabled:opacity-60"
        >
          {removingId === provider.id ? 'Removing…' : 'Remove saved provider'}
        </button>
      </div>
    </article>
  ))

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-[#202a38]">
      <div className="mx-auto flex max-w-[1500px]">
        <aside className="hidden min-h-screen w-64 shrink-0 border-r border-[#e8e4dd] bg-white p-5 lg:block">
          <Link href="/dashboard" className="mb-10 block font-serif text-lg tracking-[.14em] text-[#172b4d]">
            FAREWELL <span className="text-[#b49a62]">CONNECT</span>
          </Link>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.2em] text-[#b49a62]">Your space</p>
          <nav className="flex flex-col gap-1">
            {nav.map(([label, Icon]) => (
              <button
                type="button"
                key={label}
                onClick={() => setView(label)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm ${view === label ? 'bg-[#f5f0e8] font-semibold text-[#172b4d]' : 'text-[#697586] hover:bg-[#fbfaf7]'}`}
              >
                <Icon className="size-4" />{label}
              </button>
            ))}
          </nav>
          <button type="button" onClick={() => logout('/login')} className="mt-10 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#8a5b55] hover:bg-[#f1e5e3]">
            <LogOut className="size-4" />Log out
          </button>
        </aside>
        <main className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-[#e8e4dd] bg-white px-5 py-4 sm:px-8">
            <div>
              <p className="text-xs text-[#697586]">Customer space</p>
              <h1 className="font-serif text-xl text-[#172b4d]">Welcome{user?.full_name ? `, ${user.full_name}` : ''}</h1>
            </div>
            <button type="button" onClick={() => logout('/login')} className="rounded-full border border-[#e8e4dd] px-3 py-1.5 text-xs font-semibold text-[#536172]">Log out</button>
          </header>
          <div className="border-b border-[#e8e4dd] bg-white px-5 py-3 lg:hidden">
            <label className="sr-only" htmlFor="customer-dashboard-navigation">Dashboard section</label>
            <select id="customer-dashboard-navigation" value={view} onChange={(event) => setView(event.target.value)} className="w-full rounded-xl bg-[#f5f0e8] px-3 py-2 text-sm">
              {nav.map(([label]) => <option key={label}>{label}</option>)}
            </select>
          </div>
          <div className="mx-auto max-w-6xl p-5 sm:p-8 lg:p-12">
            {view === 'Overview' && (
              <>
                <section className="rounded-[2rem] bg-[#f5f0e8] p-7 sm:p-10">
                  <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#b49a62]">Your account</p>
                  <h2 className="mt-3 max-w-2xl font-serif text-4xl leading-tight text-[#172b4d] sm:text-5xl">Find the support you need, with simplicity and care.</h2>
                  <p className="mt-5 max-w-xl leading-7 text-[#536172]">Explore trusted funeral-service providers and manage your actual requests here.</p>
                  <Link href="/dashboard/marketplace" className="mt-7 inline-block rounded-full bg-[#172b4d] px-6 py-3.5 text-sm font-semibold text-white">
                    Explore marketplace <ArrowRight className="ml-2 inline size-4" />
                  </Link>
                </section>
                <section className="mt-10">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-serif text-3xl text-[#172b4d]">Your bookings</h2>
                    <button type="button" onClick={() => setView('My Bookings')} className="text-sm font-semibold text-[#172b4d]">View all</button>
                  </div>
                  {loadingBookings
                    ? <p role="status" className="mt-5 text-sm text-[#697586]">Loading your bookings…</p>
                    : bookingsError
                      ? <p role="alert" className="mt-5 text-sm text-[#8a5b55]">{bookingsError}</p>
                      : bookings.length
                        ? <div className="mt-5 flex flex-col gap-4">{bookingCards(bookings.slice(0, 2))}</div>
                        : <EmptyState title="No bookings yet" action="Explore marketplace" href="/dashboard/marketplace" />}
                </section>
              </>
            )}
            {view === 'Find Services' && (
              <section>
                <h2 className="font-serif text-4xl text-[#172b4d]">Find services with care.</h2>
                <p className="mt-3 text-[#697586]">Search and compare providers when you&apos;re ready.</p>
                <Link href="/dashboard/marketplace" className="mt-7 inline-block rounded-full bg-[#172b4d] px-6 py-3 text-sm font-semibold text-white">Explore marketplace <ArrowRight className="ml-2 inline size-4" /></Link>
              </section>
            )}
            {view === 'My Bookings' && (
              <section>
                <h2 className="font-serif text-4xl text-[#172b4d]">Your bookings</h2>
                {loadingBookings
                  ? <p role="status" className="mt-5 text-sm text-[#697586]">Loading your bookings…</p>
                  : bookingsError
                    ? <div><p role="alert" className="mt-5 text-sm text-[#8a5b55]">{bookingsError}</p><button type="button" onClick={() => void loadBookings()} className="mt-3 text-sm font-semibold text-[#172b4d]">Try again</button></div>
                    : bookings.length
                      ? <div className="mt-6 flex flex-col gap-4">{bookingCards(bookings)}</div>
                      : <EmptyState title="You haven’t made any bookings yet." action="Explore services" href="/dashboard/marketplace" />}
              </section>
            )}
            {view === 'Saved Providers' && (
              <section>
                <h2 className="font-serif text-4xl text-[#172b4d]">Saved providers</h2>
                <p className="mt-3 text-[#697586]">Providers you save from the marketplace appear here.</p>
                {favoritesError && <p role="alert" className="mt-5 text-sm text-[#8a5b55]">{favoritesError}</p>}
                {loadingFavorites
                  ? <p role="status" className="mt-5 text-sm text-[#697586]">Loading saved providers…</p>
                  : favorites.length
                    ? <div className="mt-6 grid gap-5 sm:grid-cols-2">{favoriteCards}</div>
                    : !favoritesError && <EmptyState title="No saved providers yet" action="Explore marketplace" href="/dashboard/marketplace" />}
                {!loadingFavorites && favoritesError && <button type="button" onClick={() => void loadFavorites()} className="mt-3 text-sm font-semibold text-[#172b4d]">Try again</button>}
              </section>
            )}
            {view === 'Account Settings' && <AccountSettings />}
          </div>
        </main>
      </div>
    </div>
  )
}

function EmptyState({ title, action, href }: { title: string; action: string; href: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-[#d8d0c3] bg-white p-10 text-center">
      <HeartHandshake className="mx-auto size-8 text-[#b49a62]" />
      <p className="mt-4 font-serif text-2xl text-[#172b4d]">{title}</p>
      <Link href={href} className="mt-5 inline-block rounded-full bg-[#172b4d] px-5 py-3 text-sm font-semibold text-white">{action}</Link>
    </div>
  )
}
