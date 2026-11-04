'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, CircleHelp, Flower2, Search, Star } from 'lucide-react'
import { useAuth } from '@/app/providers'
import { apiUrl, isRecord, parseApiResponse } from '@/lib/api'
import { Footer, Header } from '@/components/site-chrome'

const categoryNamesBySlug: Record<string, string> = {
  'cemetery-services': 'Cemetery Services',
  'mortuary-services': 'Mortuary Services',
  'funeral-transportation': 'Transportation',
  'funeral-equipment': 'Equipment & Supplies',
  'decorations-and-flowers': 'Flowers & Decorations',
  'cremation-services': 'Cremation Services',
}

type MarketplaceService = {
  id: string
  service_name: string
  description: string | null
  price: string | number | null
  currency: string
  pricing_type: string
  availability_status: string
  location: string | null
  district: string | null
  category_id: string
  category_name: string
  provider_id: string
  business_name: string
  provider_rating: string | number | null
  provider_review_count: string | number | null
}

type MarketplacePagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

function isMarketplaceService(value: unknown): value is MarketplaceService {
  if (!isRecord(value)) return false
  const nullableText = (field: unknown) => field === null || typeof field === 'string'
  const nullableNumber = (field: unknown) => field === null || typeof field === 'number' || typeof field === 'string'
  return typeof value.id === 'string'
    && typeof value.service_name === 'string'
    && nullableText(value.description)
    && nullableNumber(value.price)
    && typeof value.currency === 'string'
    && typeof value.pricing_type === 'string'
    && typeof value.availability_status === 'string'
    && nullableText(value.location)
    && nullableText(value.district)
    && typeof value.category_id === 'string'
    && typeof value.category_name === 'string'
    && typeof value.provider_id === 'string'
    && typeof value.business_name === 'string'
    && nullableNumber(value.provider_rating)
    && nullableNumber(value.provider_review_count)
}

function isMarketplacePagination(value: unknown): value is MarketplacePagination {
  return isRecord(value)
    && Number.isSafeInteger(value.page)
    && Number.isSafeInteger(value.limit)
    && Number.isSafeInteger(value.total)
    && Number.isSafeInteger(value.totalPages)
}

function numericValue(value: string | number | null) {
  if (value === null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatPrice(value: string | number | null, currency: string) {
  const amount = numericValue(value)
  return amount === null ? 'Price available on request' : `${amount.toLocaleString('en')} ${currency}`
}

export function Marketplace({ categorySlug }: { categorySlug?: string }){
  const {token}=useAuth()
  const [search,setSearch]=useState('')
  const [categoryId,setCategoryId]=useState('')
  const [district,setDistrict]=useState('')
  const [minPrice,setMinPrice]=useState('')
  const [maxPrice,setMaxPrice]=useState('')
  const [page,setPage]=useState(1)
  const [limit,setLimit]=useState(20)
  const [services,setServices]=useState<MarketplaceService[]>([])
  const [pagination,setPagination]=useState<MarketplacePagination>({page:1,limit:20,total:0,totalPages:0})
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [retryCount,setRetryCount]=useState(0)
  const [saved,setSaved]=useState<string[]>([])
  const [sort,setSort]=useState('Popular')

  useEffect(() => {
    setCategoryId('')
    setPage(1)
  }, [categorySlug])

  useEffect(() => {
    if (!categorySlug || categoryId) return
    const categoryName = categoryNamesBySlug[categorySlug]
    const matchingService = services.find((service) => service.category_name === categoryName)
    if (matchingService) setCategoryId(matchingService.category_id)
  }, [categoryId, categorySlug, services])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams()
    const trimmedSearch = search.trim()
    if (trimmedSearch) params.set('search', trimmedSearch)
    if (categoryId.trim()) params.set('category', categoryId.trim())
    if (district.trim()) params.set('district', district.trim())
    if (minPrice) params.set('minPrice', minPrice)
    if (maxPrice) params.set('maxPrice', maxPrice)
    params.set('page', String(page))
    params.set('limit', String(limit))

    setLoading(true)
    setError('')
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(apiUrl(`/api/services?${params.toString()}`), {
          signal: controller.signal,
        })
        const payload = await parseApiResponse(response)
        if (!response.ok) {
          const message = isRecord(payload) && typeof payload.message === 'string'
            ? payload.message
            : 'Could not load services. Please try again.'
          throw new Error(message)
        }
        if (
          !isRecord(payload)
          || payload.success !== true
          || !Array.isArray(payload.services)
          || !payload.services.every(isMarketplaceService)
          || !isMarketplacePagination(payload.pagination)
        ) {
          throw new Error('The server returned an invalid services response.')
        }
        setServices(payload.services)
        setPagination(payload.pagination)
      } catch (reason) {
        if (controller.signal.aborted) return
        setServices([])
        setPagination({page,limit,total:0,totalPages:0})
        setError(reason instanceof Error ? reason.message : 'Could not load services. Please try again.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 250)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [categoryId, district, limit, maxPrice, minPrice, page, retryCount, search])

  const results=useMemo(()=>{
    const sorted = [...services]
    if (sort === 'Rating') {
      sorted.sort((a,b) => (numericValue(b.provider_rating) ?? -1) - (numericValue(a.provider_rating) ?? -1))
    } else if (sort === 'Price') {
      sorted.sort((a,b) => (numericValue(a.price) ?? Number.POSITIVE_INFINITY) - (numericValue(b.price) ?? Number.POSITIVE_INFINITY))
    }
    return sorted
  },[services,sort])
  const inputCls='w-full bg-white py-2.5 text-sm text-[#172b4d] placeholder:text-[#9aabb8] outline-none'
  const selectCls='w-full rounded-xl border border-[#ddd8d0] bg-white px-3 py-2.5 text-sm text-[#172b4d] outline-none focus:border-[#b49a62] focus:ring-2 focus:ring-[#b49a62]/20'
  const locationFor = (service: MarketplaceService) => [service.district, service.location]
    .filter((value, index, values) => value && values.findIndex((item) => item?.toLowerCase() === value.toLowerCase()) === index)
    .join(' · ')

  function resetFilters() {
    setSearch('')
    setCategoryId('')
    setDistrict('')
    setMinPrice('')
    setMaxPrice('')
    setPage(1)
  }

  return <><Header /><main className="min-h-screen bg-[#fbfaf7] pt-28">
    <div className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
      <div className="flex flex-col justify-between gap-6 border-b border-[#e8e4dd] pb-8 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#b49a62]">Service marketplace</p>
          <h1 className="mt-2 font-serif text-4xl text-[#172b4d] sm:text-5xl">Find trusted <em className="font-light">funeral services.</em></h1>
          <p className="mt-3 max-w-xl text-[#536172]">Compare funeral services from providers across Rwanda and find the support you need with confidence.</p>
        </div>
        {token
          ? <Link href="/dashboard" className="shrink-0 rounded-full bg-[#172b4d] px-5 py-2.5 text-sm font-semibold text-white">My dashboard</Link>
          : <Link href="/customer-registration" className="shrink-0 rounded-full bg-[#172b4d] px-5 py-2.5 text-sm font-semibold text-white">Get started <ArrowRight className="ml-1 inline size-4"/></Link>
        }
      </div>

      <div className="mt-8 rounded-2xl border border-[#e5e0d8] bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <label className="flex items-center gap-2 rounded-xl border border-[#ddd8d0] bg-white px-3 focus-within:border-[#b49a62] focus-within:ring-2 focus-within:ring-[#b49a62]/20">
            <Search className="size-4 shrink-0 text-[#9aabb8]"/>
            <input
              aria-label="Search services"
              value={search}
              onChange={event=>{setSearch(event.target.value);setPage(1)}}
              placeholder="Search services"
              className={inputCls}
            />
          </label>
          <input
            aria-label="Category ID"
            list="marketplace-categories"
            inputMode="numeric"
            value={categoryId}
            onChange={event=>{setCategoryId(event.target.value);setPage(1)}}
            placeholder="Any category"
            className={`${selectCls} placeholder:text-[#9aabb8]`}
          />
          <datalist id="marketplace-categories">
            {[...new Map(services.map(service=>[service.category_id,service.category_name])).entries()].map(([id,name])=><option key={id} value={id} label={name}/>)}
          </datalist>
          <input
            aria-label="District"
            value={district}
            onChange={event=>{setDistrict(event.target.value);setPage(1)}}
            placeholder="Any district"
            className={`${selectCls} placeholder:text-[#9aabb8]`}
          />
          <input
            aria-label="Minimum price"
            type="number"
            min="0"
            step="0.01"
            value={minPrice}
            onChange={event=>{setMinPrice(event.target.value);setPage(1)}}
            placeholder="Min price"
            className={`${selectCls} placeholder:text-[#9aabb8]`}
          />
          <input
            aria-label="Maximum price"
            type="number"
            min="0"
            step="0.01"
            value={maxPrice}
            onChange={event=>{setMaxPrice(event.target.value);setPage(1)}}
            placeholder="Max price"
            className={`${selectCls} placeholder:text-[#9aabb8]`}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#f0ece5] pt-3">
          <p className="text-sm text-[#697586]" aria-live="polite">
            {loading ? 'Updating services…' : `${pagination.total} ${pagination.total===1?'service':'services'} found`}
          </p>
          <div className="flex items-center gap-3">
            <label htmlFor="marketplace-sort" className="text-xs text-[#697586]">Sort this page</label>
            <select id="marketplace-sort" aria-label="Sort this page" value={sort} onChange={event=>setSort(event.target.value)} className={selectCls}>
              <option value="Popular">Recommended</option>
              <option value="Rating">Highest rated</option>
              <option value="Price">Lowest price</option>
            </select>
            <label htmlFor="marketplace-limit" className="sr-only">Services per page</label>
            <select
              id="marketplace-limit"
              aria-label="Services per page"
              value={limit}
              onChange={event=>{setLimit(Number(event.target.value));setPage(1)}}
              className={selectCls}
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>
      </div>

      {loading
        ? <div role="status" className="mt-12 rounded-2xl border border-[#e8e4dd] bg-white p-12 text-center text-sm text-[#697586]">Finding available services…</div>
        : error
          ? <div role="alert" className="mt-12 rounded-2xl border border-[#ead4d0] bg-white p-10 text-center">
              <CircleHelp className="mx-auto size-8 text-[#b46b62]"/>
              <h2 className="mt-4 font-serif text-2xl text-[#172b4d]">We couldn&apos;t load services</h2>
              <p className="mt-2 text-sm text-[#697586]">{error}</p>
              <button onClick={()=>setRetryCount(value=>value+1)} className="mt-5 rounded-full bg-[#172b4d] px-5 py-2.5 text-sm font-semibold text-white">Try again</button>
            </div>
          : results.length===0
            ? <div className="mt-12 rounded-2xl border border-dashed border-[#d8d0c3] bg-white p-12 text-center sm:p-16">
                <CircleHelp className="mx-auto size-8 text-[#b49a62]"/>
                <h2 className="mt-4 font-serif text-2xl text-[#172b4d]">No services available yet</h2>
                <p className="mt-2 text-sm text-[#697586]">There are no published services matching these filters. Please check back soon or adjust your search.</p>
                {(search||categoryId||district||minPrice||maxPrice)&&<button onClick={resetFilters} className="mt-5 rounded-full border border-[#d9cfbd] px-5 py-2.5 text-sm font-semibold text-[#172b4d]">Clear filters</button>}
              </div>
            : <>
                <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {results.map(service=>
                    <article key={service.id} className="flex flex-col overflow-hidden rounded-2xl border border-[#e8e4dd] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className="relative flex h-28 items-center justify-center bg-gradient-to-br from-[#f5f0e8] via-[#f2ede4] to-[#e8efe9]">
                        <Flower2 className="size-10 text-[#b49a62]" aria-hidden="true"/>
                        <button
                          onClick={()=>setSaved(items=>items.includes(service.id)?items.filter(id=>id!==service.id):[...items,service.id])}
                          aria-label={saved.includes(service.id)?`Remove ${service.service_name} from saved`:`Save ${service.service_name}`}
                          className="absolute right-3 top-3 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#172b4d] shadow-sm ring-1 ring-[#e8e4dd] hover:ring-[#b49a62]"
                        >{saved.includes(service.id)?'Saved ✓':'Save'}</button>
                        <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#58725f] shadow-sm">
                          <BadgeCheck className="size-3.5 text-[#b49a62]"/>Verified provider
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h2 className="font-serif text-lg font-semibold leading-snug text-[#172b4d]">{service.service_name}</h2>
                            <p className="mt-0.5 text-xs text-[#697586]">{service.business_name}</p>
                          </div>
                          {service.provider_rating!==null&&<span className="flex shrink-0 items-center gap-1 rounded-full bg-[#f5f0e8] px-2.5 py-1 text-xs font-semibold text-[#172b4d]">
                            <Star className="size-3.5 fill-[#b49a62] text-[#b49a62]"/>{numericValue(service.provider_rating)?.toLocaleString('en') ?? service.provider_rating}
                            {service.provider_review_count!==null&&<span className="font-normal text-[#697586]">({numericValue(service.provider_review_count)?.toLocaleString('en') ?? service.provider_review_count})</span>}
                          </span>}
                        </div>
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#536172]">{service.description?.trim() || 'The provider has not added a description yet.'}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="inline-block w-fit rounded-full border border-[#e8e4dd] px-2.5 py-0.5 text-xs font-medium text-[#536172]">{service.category_name}</span>
                          {service.availability_status&&<span className="inline-block w-fit rounded-full bg-[#f5f0e8] px-2.5 py-0.5 text-xs font-medium capitalize text-[#536172]">{service.availability_status.replaceAll('_',' ')}</span>}
                        </div>
                        {locationFor(service)&&<p className="mt-3 text-xs text-[#697586]">{locationFor(service)}</p>}
                        <div className="mt-auto flex items-end justify-between gap-3 border-t border-[#eeeae3] pt-4 mt-4">
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-[#9aabb8]">{service.pricing_type.replaceAll('_',' ')}</p>
                            <p className="text-sm font-semibold text-[#172b4d]">{formatPrice(service.price,service.currency)}</p>
                          </div>
                          <Link href="/booking" className="rounded-full bg-[#172b4d] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1e3a6a]">Request</Link>
                        </div>
                      </div>
                    </article>
                  )}
                </div>
                <nav aria-label="Service listing pages" className="mt-8 flex items-center justify-between gap-4">
                  <p className="text-sm text-[#697586]">Page {pagination.page} of {pagination.totalPages}</p>
                  <div className="flex gap-2">
                    <button
                      disabled={loading||page<=1}
                      onClick={()=>setPage(value=>Math.max(1,value-1))}
                      className="rounded-full border border-[#d9cfbd] px-4 py-2 text-sm font-semibold text-[#172b4d] disabled:cursor-not-allowed disabled:opacity-45"
                    >Previous</button>
                    <button
                      disabled={loading||page>=pagination.totalPages}
                      onClick={()=>setPage(value=>value+1)}
                      className="rounded-full border border-[#d9cfbd] px-4 py-2 text-sm font-semibold text-[#172b4d] disabled:cursor-not-allowed disabled:opacity-45"
                    >Next</button>
                  </div>
                </nav>
              </>
      }
    </div>
  </main><Footer /></>
}
