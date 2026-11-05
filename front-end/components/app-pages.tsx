'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, BadgeCheck, Bell, CalendarDays, Check, ChevronDown, CircleHelp, Clock3, Compass, Flower2, HeartHandshake, Menu, Package, Search, ShieldCheck, Sparkles, Star, Truck, UserRound, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminProviderVerification } from '@/components/admin-provider-verification'
import { ProviderServiceManagement } from '@/components/provider-service-management'
import { AccountSettings } from '@/components/account-settings'
import { useAuth } from '@/app/providers'
import { apiUrl, isJwt, isRecord, parseApiResponse } from '@/lib/api'
import { Footer, Header } from '@/components/site-chrome'

type Category = { name: string; slug: string; description: string; icon: typeof Flower2; image: string; count: string; accent: string }
const categories: Category[] = [
  { name: 'Cemetery Services', slug: 'cemetery-services', description: 'Thoughtful spaces and essential care for a lasting memorial.', icon: Compass, image: 'https://images.unsplash.com/photo-1508620551736-6c8f3a6d6ce8?auto=format&fit=crop&w=900&q=80', count: '12 providers', accent: 'from-[#526b62] to-[#9eae9a]' },
  { name: 'Mortuary Services', slug: 'mortuary-services', description: 'Respectful, professional preparation and care for your loved one.', icon: HeartHandshake, image: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=900&q=80', count: '18 providers', accent: 'from-[#77899b] to-[#c8d1d6]' },
  { name: 'Transportation', slug: 'funeral-transportation', description: 'Reliable, dignified transport coordinated with care.', icon: Truck, image: 'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=900&q=80', count: '9 providers', accent: 'from-[#8f7662] to-[#cbb9a4]' },
  { name: 'Equipment & Supplies', slug: 'funeral-equipment', description: 'Quality essentials, caskets, tents and furnishings in one place.', icon: Package, image: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=900&q=80', count: '15 providers', accent: 'from-[#718079] to-[#b8c4ba]' },
  { name: 'Flowers & Decorations', slug: 'decorations-and-flowers', description: 'Beautiful details that make a meaningful farewell personal.', icon: Flower2, image: 'https://images.unsplash.com/photo-1487070183336-b863922373d4?auto=format&fit=crop&w=900&q=80', count: '21 providers', accent: 'from-[#98798a] to-[#d2b8c4]' },
  { name: 'Cremation Services', slug: 'cremation-services', description: 'Guided options delivered with clarity, sensitivity and respect.', icon: Sparkles, image: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80', count: '6 providers', accent: 'from-[#aa8e68] to-[#d6c3a6]' },
]
const providers = [
  { name: 'Imena Memorial Care', location: 'Kigali · Kicukiro', rating: '4.9', service: 'Mortuary & Memorial Care', price: 'From 280,000 RWF', image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=800&q=80', verified: true },
  { name: 'Urugwiro Gardens', location: 'Kigali · Gasabo', rating: '4.8', service: 'Cemetery Services', price: 'From 450,000 RWF', image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80', verified: true },
  { name: 'Dignity Transit Rwanda', location: 'Kigali · Nationwide', rating: '4.7', service: 'Funeral Transportation', price: 'From 85,000 RWF', image: 'https://images.unsplash.com/photo-1525609004556-c46c7cf7cf3d?auto=format&fit=crop&w=800&q=80', verified: true },
]

function getSafeReturnPath(): string | null {
  const returnTo = new URLSearchParams(window.location.search).get('redirectTo')
  if (!returnTo || !returnTo.startsWith('/')) return null
  try {
    const destination = new URL(returnTo, window.location.origin)
    if (destination.origin !== window.location.origin) return null
    return `${destination.pathname}${destination.search}${destination.hash}`
  } catch {
    return null
  }
}

function Hero() { return <section className="relative overflow-hidden bg-[#f5f0e8] pt-28"><div className="mx-auto grid min-h-[650px] max-w-7xl items-center gap-12 px-5 pb-16 lg:grid-cols-[.85fr_1.15fr] lg:px-8 lg:pb-24"><div className="relative z-10 max-w-xl"><p className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[.22em] text-[#b49a62]"><span className="h-px w-10 bg-[#b49a62]" /> Every service. One place.</p><h1 className="font-serif text-5xl leading-[1.05] tracking-[-.03em] text-[#172b4d] sm:text-6xl lg:text-7xl">Everything you need, <em className="font-light text-[#b49a62]">all in one place.</em></h1><p className="mt-7 max-w-md text-lg leading-8 text-[#536172]">Find, compare and connect with trusted funeral-service providers through one simple platform.</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/services" className="rounded-full bg-[#172b4d] px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-[#172b4d]/20">Explore services <ArrowRight className="ml-2 inline size-4" /></Link><Link href="/provider-registration" className="rounded-full border border-[#c6b899] bg-transparent px-6 py-3.5 text-sm font-semibold text-[#172b4d]">Become a provider</Link></div><div className="mt-12 flex items-center gap-6 border-t border-[#dcd3c5] pt-6"><div><p className="font-serif text-2xl text-[#172b4d]">150+</p><p className="text-xs text-[#697586]">Verified providers</p></div><div className="h-10 w-px bg-[#dcd3c5]" /><div><p className="font-serif text-2xl text-[#172b4d]">30+</p><p className="text-xs text-[#697586]">Districts covered</p></div><div className="h-10 w-px bg-[#dcd3c5]" /><div><p className="font-serif text-2xl text-[#172b4d]">4.8/5</p><p className="text-xs text-[#697586]">Family rating</p></div></div></div><div className="relative"><div className="absolute -right-8 -top-8 size-64 rounded-full border border-[#d3c7b2] opacity-50" /><div className="relative overflow-hidden rounded-[2rem] shadow-2xl shadow-[#172b4d]/15"><img src="/farewell-hero.png" alt="Peaceful garden setting" className="h-[440px] w-full object-cover lg:h-[550px]" /><div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/30 bg-white/85 p-4 backdrop-blur-md"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-[#e8efe9]"><ShieldCheck className="size-5 text-[#58725f]" /></span><div><p className="text-sm font-semibold text-[#172b4d]">A more supported farewell</p><p className="text-xs text-[#697586]">Trusted care, when it matters most</p></div></div><BadgeCheck className="size-5 text-[#b49a62]" /></div></div></div></div></div></section> }
function Categories() { return <section className="bg-white py-24"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#b49a62]">Explore our marketplace</p><h2 className="mt-3 font-serif text-4xl text-[#172b4d] sm:text-5xl">Care, thoughtfully <em className="font-light">arranged.</em></h2></div><Link href="/services" className="text-sm font-semibold text-[#172b4d]">View all services <ArrowRight className="ml-1 inline size-4" /></Link></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{categories.map((item, index) => <Link href={`/services/${item.slug}`} key={item.slug} className={`group relative min-h-[285px] overflow-hidden rounded-2xl ${index === 0 ? 'lg:row-span-2 lg:min-h-[584px]' : ''}`}><img src={item.image} alt={item.name} className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-[#172b4d]/90 via-[#172b4d]/20 to-transparent" /><div className="absolute bottom-0 p-6 text-white"><div className="mb-4 grid size-10 place-items-center rounded-full bg-white/15 backdrop-blur"><item.icon className="size-5" /></div><h3 className="font-serif text-2xl">{item.name}</h3><p className="mt-2 max-w-xs text-sm leading-6 text-white/75">{item.description}</p><p className="mt-4 text-xs font-semibold uppercase tracking-widest text-[#e3c982]">{item.count} <ArrowRight className="ml-1 inline size-3 transition group-hover:translate-x-1" /></p></div></Link>)}</div></div></section> }
function HowItWorks() { const steps = [['01','Tell us what you need','Share a few details about the service and support you are looking for.'],['02','Compare with confidence','Browse transparent details, pricing and reviews from verified providers.'],['03','Connect with care','Send a booking request and let the right provider take it from there.']]; return <section id="how" className="bg-[#f5f0e8] py-24"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="grid gap-14 lg:grid-cols-[.7fr_1.3fr]"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#b49a62]">Simple by design</p><h2 className="mt-3 font-serif text-4xl text-[#172b4d] sm:text-5xl">Support for the <em className="font-light">journey ahead.</em></h2><p className="mt-6 leading-7 text-[#536172]">When the details feel overwhelming, Farewell Connect gives families a calm, clear place to begin.</p><Link href="/services" className="mt-8 inline-block rounded-full bg-[#b49a62] px-5 py-3 text-sm font-semibold text-[#172b4d]">Start exploring <ArrowRight className="ml-1 inline size-4" /></Link></div><div className="grid gap-4">{steps.map(([n,title,desc]) => <div key={n} className="flex gap-6 rounded-2xl border border-[#e0d8cb] bg-white/60 p-6"><span className="font-serif text-3xl text-[#b49a62]">{n}</span><div><h3 className="font-serif text-2xl text-[#172b4d]">{title}</h3><p className="mt-2 max-w-lg leading-7 text-[#697586]">{desc}</p></div></div>)}</div></div></div></section> }
function Featured() { return <section id="about" className="bg-white py-24"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="mb-10"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#b49a62]">Meet trusted care teams</p><h2 className="mt-3 font-serif text-4xl text-[#172b4d] sm:text-5xl">Featured <em className="font-light">providers.</em></h2></div><div className="grid gap-5 md:grid-cols-3">{providers.map((provider) => <div key={provider.name} className="overflow-hidden rounded-2xl border border-[#e8e4dd] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><img src={provider.image} alt={provider.name} className="h-48 w-full object-cover" /><div className="p-5"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h3 className="font-serif text-xl text-[#172b4d]">{provider.name}</h3>{provider.verified && <BadgeCheck className="size-4 text-[#b49a62]" />}</div><p className="mt-1 text-sm text-[#697586]">{provider.location}</p></div><span className="flex items-center gap-1 text-sm font-semibold text-[#172b4d]"><Star className="size-4 fill-[#b49a62] text-[#b49a62]" />{provider.rating}</span></div><p className="mt-4 text-sm text-[#536172]">{provider.service}</p><div className="mt-5 flex items-center justify-between border-t border-[#eeeae3] pt-4"><span className="text-xs text-[#697586]">{provider.price}</span><Link href="/provider/1" className="text-sm font-semibold text-[#172b4d]">View profile <ArrowRight className="ml-1 inline size-3" /></Link></div></div></div>)}</div></div></section> }
export function Home() { return <><Header /><main><Hero /><Categories /><HowItWorks /><Featured /><section className="bg-[#b49a62] py-20"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-5 md:flex-row md:items-center lg:px-8"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#172b4d]/60">For funeral-service professionals</p><h2 className="mt-3 max-w-xl font-serif text-4xl text-[#172b4d]">Grow your care practice with confidence.</h2></div><Link href="/provider-registration" className="w-fit rounded-full bg-[#172b4d] px-6 py-3.5 text-sm font-semibold text-white">Join our provider network <ArrowRight className="ml-2 inline size-4" /></Link></div></section></main><Footer /></> }
function ServicesPage() { const [query,setQuery]=useState(''); const [location,setLocation]=useState('All locations'); const filtered=useMemo(()=>providers.filter(p=>p.name.toLowerCase().includes(query.toLowerCase()) && (location==='All locations'||p.location.includes(location))),[query,location]); return <><Header /><main className="min-h-screen bg-[#fbfaf7] pt-32"><div className="mx-auto max-w-7xl px-5 pb-24 lg:px-8"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#b49a62]">The marketplace</p><h1 className="mt-3 font-serif text-5xl text-[#172b4d]">Find trusted <em className="font-light">care.</em></h1><p className="mt-4 max-w-xl text-[#697586]">Browse verified funeral-service providers across Rwanda. Sample listings are clearly marked for demonstration.</p><div className="mt-10 flex flex-col gap-3 rounded-2xl border border-[#e5e0d8] bg-white p-3 shadow-sm md:flex-row"><div className="flex flex-1 items-center gap-3 rounded-xl bg-[#f5f0e8] px-4"><Search className="size-4 text-[#697586]" /><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search providers or services" className="w-full bg-transparent py-3 text-sm outline-none" /></div><select value={location} onChange={e=>setLocation(e.target.value)} className="rounded-xl border-0 bg-[#f5f0e8] px-4 py-3 text-sm text-[#536172] outline-none"><option>All locations</option><option>Kigali</option><option>Nationwide</option></select><Link href="/booking" className="rounded-xl bg-[#172b4d] px-5 py-3 text-center text-sm font-semibold text-white">Request a booking</Link></div><div className="mt-12 grid gap-5 md:grid-cols-3">{filtered.map(p=><div key={p.name} className="overflow-hidden rounded-2xl border border-[#e8e4dd] bg-white shadow-sm"><img src={p.image} alt={p.name} className="h-52 w-full object-cover" /><div className="p-5"><div className="flex justify-between"><div><h2 className="font-serif text-xl text-[#172b4d]">{p.name}</h2><p className="text-sm text-[#697586]">{p.location}</p></div><BadgeCheck className="size-5 text-[#b49a62]" /></div><p className="mt-4 text-sm text-[#536172]">{p.service}</p><p className="mt-3 text-sm font-semibold text-[#172b4d]">{p.price}</p><Link href="/provider/1" className="mt-5 block rounded-full border border-[#d9cfbd] py-2.5 text-center text-sm font-semibold text-[#172b4d]">View details</Link></div></div>)}</div></div></main><Footer /></> }
function SimplePage({title, eyebrow, children}:{title:string;eyebrow:string;children?:React.ReactNode}) { return <><Header /><main className="min-h-screen bg-[#fbfaf7] px-5 pb-24 pt-36"><div className="mx-auto max-w-4xl"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#b49a62]">{eyebrow}</p><h1 className="mt-3 font-serif text-5xl text-[#172b4d]">{title}</h1>{children || <p className="mt-6 max-w-2xl leading-8 text-[#697586]">This premium experience is ready for your next step. Connect with our team to learn more about how Farewell Connect supports families and providers across Rwanda.</p>}</div></main><Footer /></> }
// RegField must live at module scope — never inside another component.
// Declaring a component inside a render function causes React to treat it as
// a new type on every render, unmounting and remounting the input, which
// kills focus after every keystroke.
function RegField({
  label, name, type = 'text', placeholder, value, error, onChange,
}: {
  label: string; name: string; type?: string; placeholder?: string
  value: string; error?: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-[#405064]">
      {label}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`rounded-xl border bg-[#fbfaf7] px-4 py-3 outline-none focus:ring-2 focus:ring-[#b49a62] ${
          error ? 'border-[#c0392b]' : 'border-[#ded9d0]'
        }`}
      />
      {error && <span className="text-xs text-[#c0392b]">{error}</span>}
    </label>
  )
}

function CustomerRegistrationPage() {
  const [fields, setFields] = useState({ full_name: '', email: '', phone: '', password: '', confirm_password: '' })
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const { login } = useAuth()
  const router = useRouter()

  const handleChange = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFields(f => ({ ...f, [k]: e.target.value }))
    setFieldErrors(fe => { const n = { ...fe }; delete n[k]; return n })
    setApiError('')
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!fields.full_name.trim()) errs.full_name = 'Full name is required.'
    if (!fields.email.trim() && !fields.phone.trim()) errs.email = 'Email or phone number is required.'
    if (fields.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) errs.email = 'Enter a valid email address.'
    if (fields.phone.trim() && !/^\+?[0-9\s\-]{7,20}$/.test(fields.phone.trim())) errs.phone = 'Enter a valid phone number.'
    if (fields.password.length < 8) errs.password = 'Password must be at least 8 characters.'
    if (!/[A-Z]/.test(fields.password)) errs.password = 'Password must contain at least one uppercase letter.'
    if (!/[0-9]/.test(fields.password)) errs.password = (errs.password ? errs.password + ' ' : '') + 'Password must contain at least one number.'
    if (fields.confirm_password !== fields.password) errs.confirm_password = 'Passwords do not match.'
    return errs
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setLoading(true)
    setApiError('')
    try {
      const res = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fields.full_name.trim(),
          email: fields.email.trim() || undefined,
          phone: fields.phone.trim() || undefined,
          password: fields.password,
        }),
      })
      const parsed = await parseApiResponse(res)
      const data = isRecord(parsed) ? parsed : {}
      if (!res.ok) {
        if (Array.isArray(data.errors) && data.errors.length) {
          const fe: Record<string, string> = {}
          const messages: string[] = []
          data.errors.forEach((error: unknown) => {
            if (!isRecord(error) || typeof error.message !== 'string') return
            if (typeof error.field === 'string' && ['full_name', 'email', 'phone', 'password'].includes(error.field)) {
              fe[error.field] = error.message
            } else {
              messages.push(error.message)
            }
          })
          setFieldErrors(fe)
          setApiError(messages.join(' ') || (typeof data.message === 'string' ? data.message : 'Registration failed. Please try again.'))
        } else {
          setApiError(typeof data.message === 'string' ? data.message : 'Registration failed. Please try again.')
        }
        return
      }
      const user = data.user
      if (
        !isJwt(data.token) ||
        !isRecord(user) ||
        (typeof user.id !== 'string' && typeof user.id !== 'number') ||
        user.role !== 'customer' ||
        typeof user.full_name !== 'string'
      ) {
        setApiError('The server response did not contain a valid authenticated customer account.')
        return
      }

      login(data.token, { id: user.id, role: 'customer', full_name: user.full_name })
      router.replace(getSafeReturnPath() ?? '/dashboard')
    } catch (reason) {
      setApiError(reason instanceof Error ? reason.message : 'Could not reach the server. Check your API configuration and connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <><Header /><main className="min-h-screen bg-[#f5f0e8] px-5 pb-24 pt-32">
      <div className="mx-auto max-w-lg rounded-3xl bg-white p-7 shadow-xl sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#b49a62]">Welcome to Farewell Connect</p>
        <h1 className="mt-3 font-serif text-4xl text-[#172b4d]">Create your account.</h1>
        <p className="mt-3 text-sm leading-6 text-[#697586]">Already have an account? <Link href="/login" className="font-semibold text-[#172b4d]">Sign in</Link></p>
        <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-5">
          <RegField label="Full name" name="full_name" placeholder="Enter your full name" value={fields.full_name} error={fieldErrors.full_name} onChange={handleChange('full_name')} />
          <RegField label="Email address" name="email" type="email" placeholder="Enter your email address" value={fields.email} error={fieldErrors.email} onChange={handleChange('email')} />
          <RegField label="Phone number" name="phone" placeholder="Enter your phone number" value={fields.phone} error={fieldErrors.phone} onChange={handleChange('phone')} />
          <p className="-mt-3 text-xs text-[#697586]">At least one of email or phone is required.</p>
          <RegField label="Password" name="password" type="password" placeholder="Enter your password" value={fields.password} error={fieldErrors.password} onChange={handleChange('password')} />
          <RegField label="Confirm password" name="confirm_password" type="password" placeholder="Confirm your password" value={fields.confirm_password} error={fieldErrors.confirm_password} onChange={handleChange('confirm_password')} />
          {apiError && (
            <div role="alert" className="rounded-xl bg-[#f1e5e3] px-4 py-3 text-sm text-[#8a5b55]">{apiError}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-[#172b4d] px-6 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Creating account…' : <>Create account <ArrowRight className="ml-2 inline size-4" /></>}
          </button>
        </form>
      </div>
    </main><Footer /></>
  )
}

export function ProviderRegistrationPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [apiError, setApiError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [fields, setFields] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    business_name: '',
    business_description: '',
    business_phone: '',
    business_email: '',
    business_address: '',
    district: '',
    sector: '',
  })

  const handleChange = (key: keyof typeof fields) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFields((current) => ({ ...current, [key]: event.target.value }))
    setFieldErrors((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
    setApiError('')
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return

    const errors: Record<string, string> = {}
    if (!fields.full_name.trim()) errors.full_name = 'Owner full name is required.'
    if (!fields.business_name.trim()) errors.business_name = 'Business name is required.'
    if (!fields.email.trim() && !fields.phone.trim()) errors.email = 'At least one of email or phone is required.'
    if (fields.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) errors.email = 'Enter a valid email address.'
    if (fields.phone.trim() && !/^\+?[0-9\s\-]{7,20}$/.test(fields.phone.trim())) errors.phone = 'Enter a valid phone number.'
    if (fields.password.length < 8) errors.password = 'Password must be at least 8 characters.'
    if (!/[A-Z]/.test(fields.password)) errors.password = 'Password must contain at least one uppercase letter.'
    if (!/[0-9]/.test(fields.password)) errors.password = `${errors.password ? `${errors.password} ` : ''}Password must contain at least one number.`
    if (fields.confirm_password !== fields.password) errors.confirm_password = 'Passwords do not match.'
    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      return
    }

    setLoading(true)
    setApiError('')
    try {
      const response = await fetch(apiUrl('/api/auth/provider-register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fields.full_name.trim(),
          email: fields.email.trim() || undefined,
          phone: fields.phone.trim() || undefined,
          password: fields.password,
          business_name: fields.business_name.trim(),
          business_description: fields.business_description.trim() || undefined,
          business_phone: fields.business_phone.trim() || undefined,
          business_email: fields.business_email.trim() || undefined,
          business_address: fields.business_address.trim() || undefined,
          district: fields.district.trim() || undefined,
          sector: fields.sector.trim() || undefined,
        }),
      })
      const parsed = await parseApiResponse(response)
      const data = isRecord(parsed) ? parsed : {}

      if (!response.ok) {
        if (Array.isArray(data.errors)) {
          const nextErrors: Record<string, string> = {}
          const messages: string[] = []
          data.errors.forEach((error: unknown) => {
            if (!isRecord(error) || typeof error.message !== 'string') return
            if (typeof error.field === 'string') nextErrors[error.field] = error.message
            else messages.push(error.message)
          })
          setFieldErrors(nextErrors)
          setApiError(messages.join(' ') || (typeof data.message === 'string' ? data.message : 'Provider registration failed.'))
        } else {
          setApiError(typeof data.message === 'string' ? data.message : 'Provider registration failed. Please try again.')
        }
        return
      }

      if (!isRecord(data.user) || data.user.role !== 'provider') {
        setApiError('The server response did not confirm a provider application.')
        return
      }
      setSuccess(true)
    } catch (reason) {
      setApiError(reason instanceof Error ? reason.message : 'Could not reach the server. Check your API configuration and connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f5f0e8] px-5 pb-24 pt-32">
        <div className="mx-auto max-w-2xl rounded-3xl bg-white p-7 shadow-xl sm:p-10">
          {success ? (
            <div className="text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#e6f0e8] text-[#58725f]"><Check className="size-6" /></span>
              <h1 className="mt-5 font-serif text-3xl text-[#172b4d]">Application submitted.</h1>
              <p className="mt-3 text-sm leading-6 text-[#697586]">Your provider account is pending administrator verification. You can log in after registration to check its status.</p>
              <Link href="/login" className="mt-6 inline-block rounded-full bg-[#172b4d] px-6 py-3 text-sm font-semibold text-white">Continue to log in</Link>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#b49a62]">Join our provider network</p>
              <h1 className="mt-3 font-serif text-4xl text-[#172b4d]">Register your business.</h1>
              <p className="mt-3 text-sm leading-6 text-[#697586]">Applications are reviewed before services can be published.</p>
              <form onSubmit={submit} noValidate className="mt-8 grid gap-5 sm:grid-cols-2">
                <RegField label="Owner full name" name="full_name" value={fields.full_name} error={fieldErrors.full_name} onChange={handleChange('full_name')} />
                <RegField label="Business name" name="business_name" value={fields.business_name} error={fieldErrors.business_name} onChange={handleChange('business_name')} />
                <RegField label="Email address" name="email" type="email" value={fields.email} error={fieldErrors.email} onChange={handleChange('email')} />
                <RegField label="Phone number" name="phone" value={fields.phone} error={fieldErrors.phone} onChange={handleChange('phone')} />
                <RegField label="Password" name="password" type="password" value={fields.password} error={fieldErrors.password} onChange={handleChange('password')} />
                <RegField label="Confirm password" name="confirm_password" type="password" value={fields.confirm_password} error={fieldErrors.confirm_password} onChange={handleChange('confirm_password')} />
                <label className="field sm:col-span-2">Business description
                  <textarea value={fields.business_description} onChange={handleChange('business_description')} className="min-h-24" />
                </label>
                <RegField label="Business phone" name="business_phone" value={fields.business_phone} error={fieldErrors.business_phone} onChange={handleChange('business_phone')} />
                <RegField label="Business email" name="business_email" type="email" value={fields.business_email} error={fieldErrors.business_email} onChange={handleChange('business_email')} />
                <RegField label="Business address" name="business_address" value={fields.business_address} error={fieldErrors.business_address} onChange={handleChange('business_address')} />
                <RegField label="District" name="district" value={fields.district} error={fieldErrors.district} onChange={handleChange('district')} />
                <RegField label="Sector" name="sector" value={fields.sector} error={fieldErrors.sector} onChange={handleChange('sector')} />
                {apiError && <div role="alert" className="rounded-xl bg-[#f1e5e3] px-4 py-3 text-sm text-[#8a5b55] sm:col-span-2">{apiError}</div>}
                <button type="submit" disabled={loading} className="rounded-full bg-[#172b4d] px-6 py-3.5 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2">
                  {loading ? 'Submitting application…' : <>Submit provider application <ArrowRight className="ml-2 inline size-4" /></>}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
function BookingRows({bookings}:{bookings:string[][]}){return <div className="mt-5 flex flex-col">{bookings.map(b=><div key={b[0]} className="grid gap-2 border-t border-[#eeeae3] py-4 sm:grid-cols-[.7fr_1.5fr_1fr_1fr_auto] sm:items-center"><span className="text-xs text-[#697586]">{b[0]}</span><span><strong className="block text-sm text-[#172b4d]">{b[1]}</strong><span className="text-xs text-[#697586]">{b[2]}</span></span><span className="text-sm text-[#536172]">{b[3]}</span><span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${b[4]==='Pending'?'bg-[#f4ead0] text-[#816c37]':b[4]==='Completed'?'bg-[#e6f0e8] text-[#58725f]':'bg-[#f1e5e3] text-[#8a5b55]'}`}>{b[4]}</span><ChevronDown className="hidden size-4 text-[#697586] sm:block"/></div>)}</div>}

function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const router = useRouter()

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return

    const form = new FormData(event.currentTarget)
    const identifier = String(form.get('identifier') || '').trim()
    const password = String(form.get('password') || '')
    if (!identifier || !password) {
      setError('Enter your email or phone and password to continue.')
      return
    }

    setError('')
    setLoading(true)
    try {
      const response = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })
      const parsed = await parseApiResponse(response)
      const data = isRecord(parsed) ? parsed : {}
      if (!response.ok) {
        setError(typeof data.message === 'string' ? data.message : 'Login failed. Check your credentials and try again.')
        return
      }

      const authenticatedUser = data.user
      if (
        !isJwt(data.token) ||
        !isRecord(authenticatedUser) ||
        (typeof authenticatedUser.id !== 'string' && typeof authenticatedUser.id !== 'number') ||
        (authenticatedUser.role !== 'customer' && authenticatedUser.role !== 'provider' && authenticatedUser.role !== 'admin') ||
        (authenticatedUser.username !== null && typeof authenticatedUser.username !== 'string') ||
        typeof authenticatedUser.full_name !== 'string'
      ) {
        setError('The server response did not contain a valid authenticated account.')
        return
      }

      const role = authenticatedUser.role
      login(data.token, {
        id: authenticatedUser.id,
        role,
        username: authenticatedUser.username,
        full_name: authenticatedUser.full_name,
      })
      router.replace(getSafeReturnPath() ?? (role === 'provider' ? '/provider-dashboard' : role === 'admin' ? '/admin' : '/dashboard'))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not reach the server. Check your API configuration and connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f5f0e8] px-5 pb-24 pt-32">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-7 shadow-xl sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#b49a62]">Welcome back</p>
          <h1 className="mt-3 font-serif text-4xl text-[#172b4d]">Sign in to Farewell Connect.</h1>
          <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
            <label className="field">Email, phone number, or username<input name="identifier" type="text" placeholder="Email, phone number, or username" autoComplete="username" required /></label>
            <label className="field">Password<input name="password" type="password" placeholder="Enter your password" autoComplete="current-password" required /></label>
            {error && <p role="alert" className="rounded-xl bg-[#f1e5e3] p-3 text-sm text-[#8a5b55]">{error}</p>}
            <button type="submit" disabled={loading} className="rounded-full bg-[#172b4d] px-5 py-3.5 text-sm font-semibold text-white disabled:opacity-60">
              {loading ? 'Signing in…' : 'Log in'} {!loading && <ArrowRight className="ml-2 inline size-4" />}
            </button>
          </form>
          <div className="mt-6 flex justify-between text-xs">
            <Link
              href="/customer-registration"
              onClick={(event) => {
                const returnTo = getSafeReturnPath()
                if (!returnTo) return
                event.preventDefault()
                router.push(`/customer-registration?redirectTo=${encodeURIComponent(returnTo)}`)
              }}
              className="font-semibold text-[#172b4d]"
            >
              Create customer account
            </Link>
            <span className="text-[#697586]">Need help? Contact support.</span>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
function ProviderPortal() {
  const { logout, token } = useAuth()
  const [view, setView] = useState('Overview')
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'rejected' | null>(null)
  const [verificationLoading, setVerificationLoading] = useState(true)
  const [verificationError, setVerificationError] = useState('')
  const [verificationRetry, setVerificationRetry] = useState(0)
  const [requests, setRequests] = useState([
    { ref: 'FC-2048', customer: 'Aline Mukamana', service: 'Memorial preparation & care', date: '18 Nov 2026', location: 'Kicukiro', status: 'Pending' },
    { ref: 'FC-2031', customer: 'Jean Niyonzima', service: 'Family transport — Kigali', date: '22 Nov 2026', location: 'Gasabo', status: 'Pending' },
    { ref: 'FC-1988', customer: 'Sandrine U.', service: 'Floral tribute arrangement', date: '04 Oct 2026', location: 'Nyarugenge', status: 'Completed' },
  ])
  const [notice, setNotice] = useState('')
  const nav = ['Overview', 'My Business', 'My Services', 'Add New Service', 'Booking Requests', 'Manage Bookings', 'Availability', 'Customer Reviews', 'Subscription Plans', 'Business Analytics', 'Verification', 'Settings', 'Account Settings']
  useEffect(() => {
    const controller = new AbortController()

    async function loadVerificationStatus() {
      setVerificationLoading(true)
      setVerificationError('')
      setVerificationStatus(null)
      try {
        if (!token) throw new Error('Your session is unavailable. Please log in again.')

        const response = await fetch(apiUrl('/api/auth/me'), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        const payload = await parseApiResponse(response)
        if (!response.ok) {
          const message = isRecord(payload) && typeof payload.message === 'string'
            ? payload.message
            : 'Could not load your provider verification status.'
          throw new Error(message)
        }

        const user = isRecord(payload) && isRecord(payload.user) ? payload.user : null
        const status = user?.verification_status
        if (status !== 'pending' && status !== 'verified' && status !== 'rejected') {
          throw new Error('The server did not return a valid provider verification status.')
        }
        setVerificationStatus(status)
      } catch (reason) {
        if (controller.signal.aborted) return
        setVerificationError(reason instanceof Error ? reason.message : 'Could not load your provider verification status.')
      } finally {
        if (!controller.signal.aborted) setVerificationLoading(false)
      }
    }

    void loadVerificationStatus()
    return () => controller.abort()
  }, [token, verificationRetry])

  const verificationStatusLabel = verificationLoading
    ? 'Loading status…'
    : verificationStatus === 'verified'
      ? 'Verified'
      : verificationStatus === 'rejected'
        ? 'Rejected'
        : verificationStatus === 'pending'
          ? 'Under review'
          : 'Status unavailable'
  const updateRequest = (ref: string, status: string) => setRequests((current) => current.map((request) => request.ref === ref ? { ...request, status } : request))
  return (
    <div className="min-h-screen bg-[#f5f0e8] text-[#202a38]">
      <div className="mx-auto flex max-w-[1500px] gap-0">
        <aside className="hidden min-h-screen w-64 shrink-0 bg-[#172b4d] p-5 text-white lg:block">
          <Link href="/" className="mb-9 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-[#b49a62] text-[#172b4d]"><Flower2 className="size-5" /></span>
            <span className="font-serif text-base tracking-[.14em]">FAREWELL<br /><span className="text-[9px] tracking-[.3em] text-[#d8bf82]">CONNECT</span></span>
          </Link>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.18em] text-[#d8bf82]">Provider portal</p>
          <nav className="flex flex-col gap-1">
            {nav.map((item) => <button key={item} onClick={() => setView(item)} className={`rounded-xl px-3 py-2.5 text-left text-sm ${view === item ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>{item}</button>)}
          </nav>
          <div className="mt-8 rounded-2xl bg-white/10 p-4">
            <p className="text-xs text-white/60">Verification status</p>
            <p className="mt-2 flex items-center gap-2 text-sm font-semibold"><BadgeCheck className="size-4 text-[#d8bf82]" /> {verificationStatusLabel}</p>
          </div>
          <button onClick={() => logout()} className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/50 hover:bg-white/10 hover:text-white"><X className="size-4" />Log out</button>
        </aside>
        <main className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-[#e6dfd4] bg-white px-5 py-4 sm:px-8">
            <div><p className="text-xs text-[#697586]">Provider workspace</p><h1 className="font-serif text-xl text-[#172b4d]">Imena Memorial Care</h1></div>
            <div className="flex items-center gap-4">
              <button aria-label="Notifications" onClick={() => setNotice('You have 2 pending booking requests.')} className="rounded-full p-2 hover:bg-[#f5f0e8]"><Bell className="size-5 text-[#536172]" /></button>
              <button onClick={() => logout()} className="rounded-full border border-[#e8e4dd] px-3 py-1.5 text-xs font-semibold text-[#536172] hover:border-[#c0392b] hover:text-[#c0392b]">Log out</button>
              <div className="grid size-9 place-items-center rounded-full bg-[#b49a62] text-xs font-semibold text-[#172b4d]">IM</div>
            </div>
          </header>
          <div className="border-b border-[#e6dfd4] bg-white px-5 py-3 lg:hidden">
            <select value={view} onChange={(event) => setView(event.target.value)} className="w-full rounded-xl bg-[#f5f0e8] px-3 py-2 text-sm">{nav.map((item) => <option key={item}>{item}</option>)}</select>
          </div>
          <div className="p-5 sm:p-8">
            {notice && <div className="mb-5 flex items-center justify-between rounded-2xl border border-[#d9cfbd] bg-white p-4 text-sm text-[#536172]"><span><Bell className="mr-2 inline size-4 text-[#b49a62]" />{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice('')}><X className="size-4" /></button></div>}
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#b49a62]">{view}</p><h2 className="mt-2 font-serif text-4xl text-[#172b4d]">{view === 'Overview' ? 'Good morning, Imena.' : view}</h2></div>
              {(view === 'Overview' || view === 'My Services') && <button onClick={() => setView('Add New Service')} className="rounded-full bg-[#172b4d] px-5 py-3 text-sm font-semibold text-white">Add new service <ArrowRight className="ml-1 inline size-4" /></button>}
            </div>
            {view === 'Overview' && <ProviderOverview requests={requests} onView={() => setView('Booking Requests')} />}
            {view === 'My Business' && <BusinessProfile onSave={() => setNotice('Business profile saved for this demonstration session.')} />}
            {(view === 'My Services' || view === 'Add New Service') && (
              <ProviderServiceManagement
                mode={view === 'Add New Service' ? 'create' : 'list'}
                onNotice={setNotice}
                onCreated={() => setView('My Services')}
                onAddService={() => setView('Add New Service')}
                onCancelCreate={() => setView('My Services')}
              />
            )}
            {(view === 'Booking Requests' || view === 'Manage Bookings') && <RequestManagement requests={requests} updateRequest={updateRequest} />}
            {view === 'Availability' && <Availability />}
            {view === 'Customer Reviews' && <Reviews />}
            {view === 'Subscription Plans' && <Plans onChoose={(plan) => setNotice(`${plan} selected as a demonstration preference. Payment is not connected.`)} />}
            {view === 'Business Analytics' && <AnalyticsView />}
            {view === 'Verification' && (
              <Verification
                statusLabel={verificationStatusLabel}
                error={verificationError}
                onRetry={() => setVerificationRetry((count) => count + 1)}
                onSubmit={() => setNotice('Demonstration document submitted for administrator review.')}
              />
            )}
            {view === 'Settings' && <Settings onSave={() => setNotice('Settings saved for this demonstration session.')} />}
            {view === 'Account Settings' && <AccountSettings />}
          </div>
        </main>
      </div>
    </div>
  )
}
function ProviderOverview({requests,onView}:{requests:{ref:string;customer:string;service:string;date:string;location:string;status:string}[];onView:()=>void}){return <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[['Total services','3'],['Booking requests','12'],['Pending requests',String(requests.filter(r=>r.status==='Pending').length)],['Confirmed bookings','4'],['Completed bookings','18'],['Revenue (demo)','2.84M RWF']].map(([l,v])=><div key={l} className="rounded-2xl border border-[#e8e4dd] bg-white p-5 shadow-sm"><p className="text-sm text-[#697586]">{l}</p><p className="mt-3 font-serif text-3xl text-[#172b4d]">{v}</p><p className="mt-2 text-xs text-[#58725f]">+12% from last month</p></div>)}</div><div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_.7fr]"><div className="rounded-2xl border border-[#e8e4dd] bg-white p-6"><div className="flex items-center justify-between"><h3 className="font-serif text-2xl text-[#172b4d]">Booking activity</h3><span className="text-xs text-[#697586]">Last 6 months</span></div><div className="mt-8 flex h-44 items-end gap-3 border-b border-[#eeeae3] px-2">{[45,62,52,78,70,94].map((v,i)=><div key={i} className="flex flex-1 flex-col items-center gap-2"><div className="w-full rounded-t-lg bg-[#b49a62]" style={{height:`${v}%`}}/><span className="text-[10px] text-[#697586]">{['Jun','Jul','Aug','Sep','Oct','Nov'][i]}</span></div>)}</div></div><div className="rounded-2xl border border-[#e8e4dd] bg-white p-6"><h3 className="font-serif text-2xl text-[#172b4d]">Popular services</h3><div className="mt-6 flex flex-col gap-5">{[['Memorial care','68%'],['Transportation','46%'],['Floral tributes','32%']].map(([n,v])=><div key={n}><div className="mb-2 flex justify-between text-sm"><span>{n}</span><span className="text-[#697586]">{v}</span></div><div className="h-2 rounded-full bg-[#eeeae3]"><div className="h-2 rounded-full bg-[#172b4d]" style={{width:v}}/></div></div>)}</div></div></div><div className="mt-6 rounded-2xl border border-[#e8e4dd] bg-white p-6"><div className="flex items-center justify-between"><h3 className="font-serif text-2xl text-[#172b4d]">Recent requests</h3><button onClick={onView} className="text-sm font-semibold text-[#172b4d]">Manage all</button></div><ProviderRows requests={requests.slice(0,3)}/></div></>}
function ProviderRows({requests}:{requests:{ref:string;customer:string;service:string;date:string;location:string;status:string}[]}){return <div className="mt-5 flex flex-col">{requests.map(r=><div key={r.ref} className="grid gap-2 border-t border-[#eeeae3] py-4 sm:grid-cols-[.6fr_1.3fr_1.2fr_1fr_auto] sm:items-center"><span className="text-xs text-[#697586]">{r.ref}</span><span><strong className="block text-sm text-[#172b4d]">{r.customer}</strong><span className="text-xs text-[#697586]">{r.service}</span></span><span className="text-sm text-[#536172]">{r.date}</span><span className="text-sm text-[#536172]">{r.location}</span><span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${r.status==='Pending'?'bg-[#f4ead0] text-[#816c37]':r.status==='Accepted'||r.status==='Confirmed'?'bg-[#e6f0e8] text-[#58725f]':'bg-[#f1e5e3] text-[#8a5b55]'}`}>{r.status}</span></div>)}</div>}
function BusinessProfile({onSave}:{onSave:()=>void}){return <Panel title="Business profile" description="Keep the public profile families see up to date."><form onSubmit={e=>{e.preventDefault();onSave()}} className="grid gap-5 sm:grid-cols-2"><label className="field">Business name<input defaultValue="Imena Memorial Care" required/></label><label className="field">Business email<input defaultValue="hello@imena.rw" type="email" required/></label><label className="field">Phone number<input defaultValue="+250 788 123 456" required/></label><label className="field">District<input defaultValue="Kicukiro, Kigali" required/></label><label className="field sm:col-span-2">Business description<textarea defaultValue="Compassionate memorial support and professional preparation for families across Kigali." required/></label><label className="field">Operating hours<input defaultValue="Mon–Sat · 08:00–18:00"/></label><label className="field">Service categories<input defaultValue="Mortuary, transport, memorial care"/></label><button className="w-fit rounded-full bg-[#172b4d] px-5 py-3 text-sm font-semibold text-white">Save profile</button></form></Panel>}
function RequestManagement({requests,updateRequest}:{requests:{ref:string;customer:string;service:string;date:string;location:string;status:string}[];updateRequest:(ref:string,status:string)=>void}){return <Panel title="Booking requests" description="Review incoming requests and respond when ready. Actions update demonstration state only."><div className="flex flex-col gap-4">{requests.map(r=><div key={r.ref} className="rounded-2xl border border-[#e8e4dd] p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><p className="text-xs font-semibold text-[#b49a62]">{r.ref} · {r.status}</p><h3 className="mt-1 font-serif text-2xl text-[#172b4d]">{r.customer}</h3><p className="mt-1 text-sm text-[#536172]">{r.service} · {r.date} · {r.location}</p><p className="mt-3 text-sm text-[#697586]">Additional requirement: family prefers a quiet, private arrangement.</p></div><div className="flex items-start gap-2">{r.status==='Pending'&&<><button onClick={()=>{if(confirm('Accept this demonstration request?'))updateRequest(r.ref,'Accepted')}} className="rounded-full bg-[#172b4d] px-4 py-2 text-xs font-semibold text-white">Accept</button><button onClick={()=>{if(confirm('Reject this demonstration request?'))updateRequest(r.ref,'Rejected')}} className="rounded-full border border-[#ecd7d3] px-4 py-2 text-xs font-semibold text-[#8a5b55]">Reject</button></>}<button onClick={()=>alert(`Demo contact action for ${r.customer}.`)} className="rounded-full border border-[#d9cfbd] px-4 py-2 text-xs font-semibold text-[#172b4d]">Contact</button></div></div></div>)}</div></Panel>}
function Availability(){const [days,setDays]=useState<number[]>([5,12,18]);return <Panel title="Availability" description="Manage dates and hours. Overlapping reservations are prevented in this demonstration view."><div className="grid gap-8 lg:grid-cols-[1fr_.8fr]"><div><div className="mb-4 flex items-center justify-between"><h3 className="font-serif text-2xl text-[#172b4d]">November 2026</h3><CalendarDays className="size-5 text-[#b49a62]"/></div><div className="grid grid-cols-7 gap-2 text-center text-xs text-[#697586]">{['S','M','T','W','T','F','S'].map((d,i)=><span key={i}>{d}</span>)}{Array.from({length:30},(_,i)=><button key={i} onClick={()=>setDays(d=>d.includes(i+1)?d.filter(x=>x!==i+1):[...d,i+1])} className={`rounded-lg p-3 text-sm ${days.includes(i+1)?'bg-[#172b4d] text-white':'bg-[#f5f0e8] text-[#536172]'}`}>{i+1}</button>)}</div></div><div className="rounded-2xl bg-[#f5f0e8] p-5"><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#b49a62]">Operating hours</p><div className="mt-5 flex flex-col gap-4 text-sm"><label className="field">Opening time<input type="time" defaultValue="08:00"/></label><label className="field">Closing time<input type="time" defaultValue="18:00"/></label><p className="text-xs leading-5 text-[#697586]">Selected dates are marked unavailable for new requests.</p></div></div></div></Panel>}
function Reviews(){const [response,setResponse]=useState('');return <Panel title="Customer reviews" description="Your reputation helps families choose with confidence."><div className="grid gap-6 lg:grid-cols-[.6fr_1.4fr]"><div className="rounded-2xl bg-[#f5f0e8] p-6 text-center"><p className="font-serif text-5xl text-[#172b4d]">4.9</p><div className="mt-2 flex justify-center text-[#b49a62]">★★★★★</div><p className="mt-2 text-sm text-[#697586]">42 reviews</p>{[ ['5 stars','86%'],['4 stars','10%'],['3 stars','4%']].map(([x,v])=><div key={x} className="mt-4 text-left text-xs"><div className="flex justify-between"><span>{x}</span><span>{v}</span></div><div className="mt-1 h-1.5 rounded-full bg-white"><div className="h-1.5 rounded-full bg-[#b49a62]" style={{width:v}}/></div></div>)}</div><div className="flex flex-col gap-4">{['The team was clear, calm and kind throughout.','Everything was arranged with dignity and care.'].map((r,i)=><div key={r} className="rounded-2xl border border-[#e8e4dd] p-5"><div className="flex justify-between"><span className="text-[#b49a62]">★★★★★</span><span className="text-xs text-[#697586]">{i+2} Nov 2026</span></div><p className="mt-3 text-sm leading-6 text-[#536172]">&quot;{r}&quot;</p><textarea value={response} onChange={e=>setResponse(e.target.value)} placeholder="Write a response (demo)" className="mt-4 min-h-16 w-full rounded-xl border border-[#ded9d0] p-3 text-sm"/><button onClick={()=>alert('Demo response saved.')} className="mt-2 rounded-full bg-[#172b4d] px-4 py-2 text-xs font-semibold text-white">Respond</button></div>)}</div></div></Panel>}
function Plans({onChoose}:{onChoose:(p:string)=>void}){return <div className="grid gap-5 lg:grid-cols-3">{[['BASIC','15,000','Business profile · 3 listings · Standard visibility'],['PROFESSIONAL','35,000','10 listings · Improved visibility · Booking analytics'],['PREMIUM','65,000','Featured listings · Advanced analytics · Priority support']].map(([n,p,d],i)=><div key={n} className={`rounded-2xl border bg-white p-6 shadow-sm ${i===1?'border-[#b49a62] ring-2 ring-[#b49a62]/20':'border-[#e8e4dd]'}`}><p className="text-xs font-semibold tracking-[.18em] text-[#b49a62]">{n}</p><p className="mt-5 font-serif text-4xl text-[#172b4d]">{p}<span className="text-sm font-sans text-[#697586]"> RWF / month</span></p><p className="mt-5 min-h-14 text-sm leading-6 text-[#536172]">{d}</p><button onClick={()=>onChoose(n)} className="mt-7 w-full rounded-full bg-[#172b4d] py-3 text-sm font-semibold text-white">Choose plan</button><p className="mt-4 text-center text-[11px] text-[#697586]">Subscription preference only · payment not connected</p></div>)}</div>}
function AnalyticsView(){return <Panel title="Business analytics" description="Demonstration insights from your marketplace activity."><div className="grid gap-4 sm:grid-cols-3">{[['Conversion rate','32%'],['Customer activity','128'],['Monthly revenue','2.84M']].map(([l,v])=><div key={l} className="rounded-2xl bg-[#f5f0e8] p-5"><p className="text-sm text-[#697586]">{l}</p><p className="mt-2 font-serif text-3xl text-[#172b4d]">{v}</p></div>)}</div><div className="mt-6 rounded-2xl border border-[#e8e4dd] p-6"><h3 className="font-serif text-2xl text-[#172b4d]">Revenue overview</h3><div className="mt-8 flex h-48 items-end gap-3">{[35,48,42,65,58,82,92].map((v,i)=><div key={i} className="flex flex-1 flex-col items-center gap-2"><div className="w-full rounded-t-lg bg-[#b49a62]" style={{height:`${v}%`}}/><span className="text-[10px] text-[#697586]">{['May','Jun','Jul','Aug','Sep','Oct','Nov'][i]}</span></div>)}</div></div></Panel>}
function Verification({statusLabel,error,onRetry,onSubmit}:{statusLabel:string;error:string;onRetry:()=>void;onSubmit:()=>void}){const [file,setFile]=useState('');return <Panel title="Provider verification" description="Your provider verification status is loaded from your current profile."><div className="rounded-2xl bg-[#f4ead0] p-5"><p className="text-sm font-semibold text-[#816c37]">Current status: {statusLabel}</p>{error&&<div className="mt-2 text-sm leading-6 text-[#8a5b55]" role="alert"><p>{error}</p><button type="button" onClick={onRetry} className="mt-2 font-semibold underline">Retry status check</button></div>}</div><label className="field mt-6">Upload verification document<input type="file" onChange={e=>setFile(e.target.files?.[0]?.name||'')} /></label>{file&&<p className="mt-3 text-sm text-[#58725f]">Selected: {file}</p>}<button onClick={onSubmit} disabled={!file} className="mt-5 rounded-full bg-[#172b4d] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">Submit for administrator review</button></Panel>}
function Settings({onSave}:{onSave:()=>void}){return <Panel title="Settings" description="Manage your provider portal preferences."><div className="flex flex-col gap-5"><label className="flex items-center justify-between rounded-xl bg-[#f5f0e8] p-4 text-sm">Booking request notifications<input type="checkbox" defaultChecked className="accent-[#172b4d]"/></label><label className="flex items-center justify-between rounded-xl bg-[#f5f0e8] p-4 text-sm">Review notifications<input type="checkbox" defaultChecked className="accent-[#172b4d]"/></label><button onClick={onSave} className="w-fit rounded-full bg-[#172b4d] px-5 py-3 text-sm font-semibold text-white">Save settings</button></div></Panel>}
function Panel({title,description,children}:{title:string;description:string;children:React.ReactNode}){return <div className="rounded-2xl border border-[#e8e4dd] bg-white p-6 shadow-sm sm:p-8"><h3 className="font-serif text-3xl text-[#172b4d]">{title}</h3><p className="mt-2 text-sm text-[#697586]">{description}</p><div className="mt-7">{children}</div></div>}

function AdminDashboard(){const [view,setView]=useState('Overview');const [query,setQuery]=useState('');const [toast,setToast]=useState('');const nav=[['Overview',Compass],['Customers',UserRound],['Service Providers',HeartHandshake],['Provider Verification',BadgeCheck],['Service Categories',Flower2],['Services & Listings',Package],['Bookings',CalendarDays],['Payments & Transactions',Sparkles],['Subscriptions',Star],['Reviews & Complaints',CircleHelp],['Notifications',Bell],['Reports & Analytics',Compass],['Platform Settings',ShieldCheck],['Admin Profile',UserRound],['Account Settings',UserRound]] as const;const customers=[['Rene Mukamana','rene@example.rw','+250 788 456 789','Active'],['Aline Mukamana','aline@example.rw','+250 788 123 456','Active'],['Jean Niyonzima','jean@example.rw','+250 788 222 111','Suspended']];const providersAdmin=[['Imena Memorial Care','Imani Mutesi','Kicukiro','Under review'],['Urugwiro Gardens','Patrick Uwase','Gasabo','Verified'],['Dignity Transit Rwanda','Eric Habimana','Nationwide','Verified']];const bookings=[['FC-2048','Rene Mukamana','Imena Memorial Care','Mortuary care','Pending'],['FC-1992','Aline Mukamana','Urugwiro Gardens','Cemetery services','Completed'],['FC-1844','Jean Niyonzima','Dignity Transit Rwanda','Transportation','Cancelled']];const filtered=customers.filter(c=>c.join(' ').toLowerCase().includes(query.toLowerCase()));return <><div className="min-h-screen bg-[#f5f0e8] text-[#202a38]"><div className="mx-auto flex max-w-[1500px]"><aside className="hidden min-h-screen w-64 shrink-0 bg-[#172b4d] p-5 text-white lg:block"><Link href="/" className="mb-9 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-[#b49a62] text-[#172b4d]"><Flower2 className="size-5"/></span><span className="font-serif text-base tracking-[.14em]">FAREWELL<br/><span className="text-[9px] tracking-[.3em] text-[#d8bf82]">CONNECT</span></span></Link><p className="mb-3 text-[10px] font-semibold uppercase tracking-[.18em] text-[#d8bf82]">Administration</p><nav className="flex flex-col gap-1">{nav.map(([label,Icon])=><button key={label} onClick={()=>setView(label)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${view===label?'bg-white/15 text-white':'text-white/60 hover:bg-white/5 hover:text-white'}`}><Icon className="size-4"/>{label}</button>)}</nav><div className="mt-8 rounded-2xl bg-white/10 p-4"><p className="text-xs text-white/60">Workspace status</p><p className="mt-2 text-sm font-semibold text-[#d8bf82]">All systems demo-ready</p></div></aside><main className="min-w-0 flex-1"><header className="flex items-center justify-between border-b border-[#e6dfd4] bg-white px-5 py-4 sm:px-8"><div><p className="text-xs text-[#697586]">Administration workspace</p><h1 className="font-serif text-xl text-[#172b4d]">Farewell Connect</h1></div><div className="flex items-center gap-4"><button aria-label="Admin notifications" onClick={()=>setView('Notifications')} className="rounded-full p-2 hover:bg-[#f5f0e8]"><Bell className="size-5 text-[#536172]"/></button><div className="grid size-9 place-items-center rounded-full bg-[#b49a62] text-xs font-semibold text-[#172b4d]">AD</div></div></header><div className="border-b border-[#e6dfd4] bg-white px-5 py-3 lg:hidden"><select value={view} onChange={e=>setView(e.target.value)} className="w-full rounded-xl bg-[#f5f0e8] px-3 py-2 text-sm">{nav.map(([label])=><option key={label}>{label}</option>)}</select></div><div className="p-5 sm:p-8">{toast&&<div className="mb-5 flex items-center justify-between rounded-2xl border border-[#d9cfbd] bg-white p-4 text-sm text-[#536172]"><span><Check className="mr-2 inline size-4 text-[#58725f]"/>{toast}</span><button onClick={()=>setToast('')}><X className="size-4"/></button></div>}<div className="mb-8"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#b49a62]">{view}</p><h2 className="mt-2 font-serif text-4xl text-[#172b4d]">{view==='Overview'?'Welcome to Farewell Connect Administration':view}</h2><p className="mt-2 max-w-2xl text-sm text-[#697586]">{view==='Overview'?'Manage your marketplace, support providers and ensure a reliable experience for customers.':'Review and manage this area using demonstration data.'}</p></div>{view==='Overview'&&<AdminOverview setView={setView}/>} {view==='Customers'&&<AdminCustomers query={query} setQuery={setQuery} customers={filtered} onAction={x=>setToast(x)}/>} {view==='Service Providers'&&<AdminProviders providers={providersAdmin} onAction={x=>setToast(x)}/>} {view==='Provider Verification'&&<VerificationCenter onAction={x=>setToast(x)}/>} {view==='Service Categories'&&<CategoryAdmin onAction={x=>setToast(x)}/>} {view==='Services & Listings'&&<ListingAdmin onAction={x=>setToast(x)}/>} {view==='Bookings'&&<BookingAdmin bookings={bookings} onAction={x=>setToast(x)}/>} {view==='Payments & Transactions'&&<Payments/>} {view==='Subscriptions'&&<AdminPlans onAction={x=>setToast(x)}/>} {view==='Reviews & Complaints'&&<Complaints onAction={x=>setToast(x)}/>} {view==='Notifications'&&<AdminNotifications/>} {view==='Reports & Analytics'&&<Reports/>} {view==='Platform Settings'&&<AdminSettings onSave={()=>setToast('Platform settings saved for this demonstration session.')}/>} {view==='Admin Profile'&&<AdminSettings onSave={()=>setToast('Admin profile saved for this demonstration session.')}/>} {view==='Account Settings'&&<AccountSettings/>}</div></main></div></div></>}
function AdminOverview({setView}:{setView:(v:string)=>void}){return <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[['Total customers','2,486'],['Registered providers','158'],['Awaiting verification','12'],['Active services','624'],['Total bookings','3,842'],['Pending requests','46']].map(([l,v])=><div key={l} className="rounded-2xl border border-[#e8e4dd] bg-white p-5 shadow-sm"><p className="text-sm text-[#697586]">{l}</p><p className="mt-3 font-serif text-3xl text-[#172b4d]">{v}</p><p className="mt-2 text-xs text-[#58725f]">+8.4% from last month</p></div>)}</div><div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]"><div className="rounded-2xl border border-[#e8e4dd] bg-white p-6"><div className="flex justify-between"><h3 className="font-serif text-2xl text-[#172b4d]">Booking activity</h3><span className="text-xs text-[#697586]">Sample data · 6 months</span></div><div className="mt-8 flex h-48 items-end gap-3 border-b border-[#eeeae3]">{[44,57,48,72,66,88].map((v,i)=><div key={i} className="flex flex-1 flex-col items-center gap-2"><div className="w-full rounded-t-lg bg-[#b49a62]" style={{height:`${v}%`}}/><span className="text-[10px] text-[#697586]">{['Jun','Jul','Aug','Sep','Oct','Nov'][i]}</span></div>)}</div></div><div className="rounded-2xl border border-[#e8e4dd] bg-white p-6"><h3 className="font-serif text-2xl text-[#172b4d]">Booking status</h3><div className="mt-6 flex flex-col gap-4">{[['Pending','28%'],['Accepted','22%'],['Completed','38%'],['Cancelled','12%']].map(([n,v])=><div key={n}><div className="flex justify-between text-sm"><span>{n}</span><span className="text-[#697586]">{v}</span></div><div className="mt-2 h-2 rounded-full bg-[#eeeae3]"><div className="h-2 rounded-full bg-[#172b4d]" style={{width:v}}/></div></div>)}</div></div></div><div className="mt-6 grid gap-6 lg:grid-cols-2"><div className="rounded-2xl border border-[#e8e4dd] bg-white p-6"><div className="flex items-center justify-between"><h3 className="font-serif text-2xl text-[#172b4d]">Pending tasks</h3><span className="rounded-full bg-[#f4ead0] px-3 py-1 text-xs font-semibold text-[#816c37]">12 open</span></div><div className="mt-4 flex flex-col gap-3">{[['Review provider applications','12 providers awaiting verification','Provider Verification'],['Investigate reported listing','1 listing needs attention','Services & Listings'],['Review customer complaint','2 unresolved complaints','Reviews & Complaints']].map(([a,b,v])=><button key={a} onClick={()=>setView(v)} className="rounded-xl bg-[#f5f0e8] p-4 text-left"><p className="text-sm font-semibold text-[#172b4d]">{a}</p><p className="mt-1 text-xs text-[#697586]">{b}</p></button>)}</div></div><div className="rounded-2xl border border-[#e8e4dd] bg-white p-6"><h3 className="font-serif text-2xl text-[#172b4d]">Recent activity</h3><div className="mt-4 flex flex-col gap-4">{['New provider registration: Akazuba Care','Booking dispute reported: FC-2051','Subscription renewed: Urugwiro Gardens'].map((a,i)=><div key={a} className="flex gap-3 border-b border-[#eeeae3] pb-3"><span className="mt-1 size-2 rounded-full bg-[#b49a62]"/><div><p className="text-sm text-[#172b4d]">{a}</p><p className="mt-1 text-xs text-[#697586]">{i+1} hour{ i?'s':'' } ago</p></div></div>)}</div></div></div></>}
function AdminCustomers({query,setQuery,customers,onAction}:{query:string;setQuery:(q:string)=>void;customers:string[][];onAction:(x:string)=>void}){return <AdminPanel title="Customers" description="Search customer accounts and review account activity."><AdminSearch value={query} onChange={setQuery} placeholder="Search name, email or phone"/><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-[#eeeae3] text-xs uppercase tracking-wider text-[#697586]"><th className="p-3">Customer</th><th className="p-3">Phone</th><th className="p-3">Status</th><th className="p-3">Account since</th><th/></tr></thead><tbody>{customers.map(c=><tr key={c[0]} className="border-b border-[#eeeae3]"><td className="p-3"><strong className="block text-[#172b4d]">{c[0]}</strong><span className="text-xs text-[#697586]">{c[1]}</span></td><td className="p-3 text-[#536172]">{c[2]}</td><td className="p-3"><Status text={c[3]}/></td><td className="p-3 text-[#536172]">12 Mar 2026</td><td className="p-3"><button onClick={()=>onAction(`Demo customer details opened for ${c[0]}.`)} className="text-xs font-semibold text-[#172b4d]">View details</button></td></tr>)}</tbody></table></div></AdminPanel>}
function AdminProviders({providers,onAction}:{providers:string[][];onAction:(x:string)=>void}){return <AdminPanel title="Service providers" description="Monitor provider accounts, subscriptions and verification status."><div className="mb-5 flex flex-wrap gap-2">{['All','Verified','Under review','Rejected','Suspended'].map(x=><button key={x} className="rounded-full border border-[#d9cfbd] px-4 py-2 text-xs font-semibold text-[#172b4d]">{x}</button>)}</div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b border-[#eeeae3] text-xs uppercase tracking-wider text-[#697586]"><th className="p-3">Business</th><th className="p-3">Owner</th><th className="p-3">Location</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{providers.map(p=><tr key={p[0]} className="border-b border-[#eeeae3]"><td className="p-3 font-semibold text-[#172b4d]">{p[0]}</td><td className="p-3 text-[#536172]">{p[1]}</td><td className="p-3 text-[#536172]">{p[2]}</td><td className="p-3"><Status text={p[3]}/></td><td className="p-3"><button onClick={()=>onAction(`Demo provider profile opened for ${p[0]}.`)} className="text-xs font-semibold text-[#172b4d]">View provider</button></td></tr>)}</tbody></table></div></AdminPanel>}
function VerificationCenter({onAction}:{onAction:(x:string)=>void}){return <AdminProviderVerification onAction={onAction}/>}
function CategoryAdmin({onAction}:{onAction:(x:string)=>void}){return <AdminPanel title="Service categories" description="Keep the marketplace taxonomy clear and useful for families."><div className="mb-5 flex justify-end"><button onClick={()=>onAction('Demo category creation started.')} className="rounded-full bg-[#172b4d] px-4 py-2.5 text-xs font-semibold text-white">Create category <ArrowRight className="ml-1 inline size-3"/></button></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{categories.slice(0,6).map(c=><div key={c.slug} className="overflow-hidden rounded-2xl border border-[#e8e4dd] bg-white"><img src={c.image} alt={c.name} className="h-32 w-full object-cover"/><div className="p-4"><h3 className="font-serif text-lg text-[#172b4d]">{c.name}</h3><p className="mt-1 text-xs leading-5 text-[#697586]">{c.description}</p><div className="mt-4 flex gap-2"><button onClick={()=>onAction(`Editing ${c.name} in demo mode.`)} className="text-xs font-semibold text-[#172b4d]">Edit</button><button onClick={()=>onAction(`${c.name} deactivated in demo mode.`)} className="text-xs font-semibold text-[#8a5b55]">Deactivate</button></div></div></div>)}</div></AdminPanel>}
function ListingAdmin({onAction}:{onAction:(x:string)=>void}){return <AdminPanel title="Services & listings" description="Review marketplace listings and moderate provider content."><AdminSearch value="" onChange={()=>{}} placeholder="Search service listings"/><div className="mt-5 flex flex-col gap-3">{['Memorial preparation & care','Family transport — Kigali','Floral tribute arrangement'].map((x,i)=><div key={x} className="flex flex-col justify-between gap-3 rounded-xl border border-[#e8e4dd] p-4 sm:flex-row sm:items-center"><div><p className="font-semibold text-[#172b4d]">{x}</p><p className="text-xs text-[#697586]">{['Imena Memorial Care','Dignity Transit Rwanda','Imena Memorial Care'][i]} · {['Approved','Approved','Needs review'][i]}</p></div><div className="flex gap-3"><button onClick={()=>onAction(`Demo listing details opened for ${x}.`)} className="text-xs font-semibold text-[#172b4d]">Review</button><button onClick={()=>onAction(`${x} deactivated in demo mode.`)} className="text-xs font-semibold text-[#8a5b55]">Deactivate</button></div></div>)}</div></AdminPanel>}
function BookingAdmin({bookings,onAction}:{bookings:string[][];onAction:(x:string)=>void}){return <AdminPanel title="Booking management" description="Monitor requests without changing customer bookings silently."><div className="mb-5 flex gap-2 overflow-auto">{['All','Pending','Accepted','Confirmed','Completed','Rejected','Cancelled'].map(x=><button key={x} className="whitespace-nowrap rounded-full border border-[#d9cfbd] px-4 py-2 text-xs font-semibold">{x}</button>)}</div><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead><tr className="border-b border-[#eeeae3] text-xs uppercase tracking-wider text-[#697586]"><th className="p-3">Reference</th><th className="p-3">Customer</th><th className="p-3">Provider</th><th className="p-3">Service</th><th className="p-3">Status</th><th/></tr></thead><tbody>{bookings.map(b=><tr key={b[0]} className="border-b border-[#eeeae3]"><td className="p-3 text-xs text-[#697586]">{b[0]}</td><td className="p-3 font-semibold text-[#172b4d]">{b[1]}</td><td className="p-3 text-[#536172]">{b[2]}</td><td className="p-3 text-[#536172]">{b[3]}</td><td className="p-3"><Status text={b[4]}/></td><td className="p-3"><button onClick={()=>onAction(`Booking details opened for ${b[0]}.`)} className="text-xs font-semibold text-[#172b4d]">Details</button></td></tr>)}</tbody></table></div></AdminPanel>}
function Payments(){return <AdminPanel title="Payments & transactions" description="Demonstration transactions only. Payment integration is not connected."><div className="grid gap-4 sm:grid-cols-3">{[['Successful','2.4M RWF'],['Pending','186,000 RWF'],['Refunded','72,000 RWF']].map(([l,v])=><div key={l} className="rounded-2xl bg-[#f5f0e8] p-5"><p className="text-sm text-[#697586]">{l}</p><p className="mt-2 font-serif text-2xl text-[#172b4d]">{v}</p></div>)}</div><div className="mt-6 rounded-2xl border border-[#e8e4dd] p-5 text-sm"><div className="grid grid-cols-4 gap-3 border-b border-[#eeeae3] pb-3 text-xs uppercase text-[#697586]"><span>Reference</span><span>Method</span><span>Amount</span><span>Status</span></div>{['TX-1028','TX-1027','TX-1026'].map((x,i)=><div key={x} className="grid grid-cols-4 gap-3 border-b border-[#eeeae3] py-4"><span>{x}</span><span>{i?'Airtel Money':'MTN Mobile Money'}</span><span>{[280000,85000,65000][i].toLocaleString()} RWF</span><Status text={i?'Pending':'Successful'}/></div>)}</div></AdminPanel>}
function AdminPlans({onAction}:{onAction:(x:string)=>void}){return <AdminPanel title="Subscriptions" description="Configure provider packages and monitor renewal status."><div className="grid gap-4 lg:grid-cols-3">{[['Basic','15,000 RWF','3 listings · Standard visibility'],['Professional','35,000 RWF','10 listings · Booking analytics'],['Premium','65,000 RWF','Featured listings · Priority support']].map(([n,p,d])=><div key={n} className="rounded-2xl border border-[#e8e4dd] p-5"><p className="text-xs font-semibold uppercase tracking-wider text-[#b49a62]">{n}</p><p className="mt-4 font-serif text-3xl text-[#172b4d]">{p}</p><p className="mt-2 text-sm text-[#697586]">{d}</p><button onClick={()=>onAction(`${n} package configuration opened.`)} className="mt-5 rounded-full border border-[#d9cfbd] px-4 py-2 text-xs font-semibold">Configure plan</button></div>)}</div></AdminPanel>}
function Complaints({onAction}:{onAction:(x:string)=>void}){return <AdminPanel title="Reviews & complaints" description="Moderate feedback and record actions taken by the platform team."><div className="flex flex-col gap-3">{[['Complaint #C-109','Provider communication concern','Open'],['Review report #R-72','Inappropriate listing content','Investigating'],['Complaint #C-103','Booking dispute','Resolved']].map(([a,b,c])=><div key={a} className="flex flex-col justify-between gap-3 rounded-xl border border-[#e8e4dd] p-4 sm:flex-row sm:items-center"><div><p className="font-semibold text-[#172b4d]">{a}</p><p className="mt-1 text-sm text-[#697586]">{b}</p></div><div className="flex items-center gap-3"><Status text={c}/><button onClick={()=>onAction(`${a} marked resolved in demo mode.`)} className="text-xs font-semibold text-[#172b4d]">Resolve</button></div></div>)}</div></AdminPanel>}
function AdminNotifications(){return <AdminPanel title="Notifications" description="Stay on top of marketplace activity that needs attention."><div className="flex flex-col gap-3">{['New provider registration requires review.','Customer complaint submitted for FC-2051.','Payment transaction TX-1028 failed.'].map((x,i)=><div key={x} className="flex items-center gap-4 rounded-xl bg-[#f5f0e8] p-4"><span className="grid size-9 place-items-center rounded-full bg-white"><Bell className="size-4 text-[#b49a62]"/></span><div><p className="text-sm text-[#172b4d]">{x}</p><p className="mt-1 text-xs text-[#697586]">{i+1} hour{i?'s':''} ago</p></div></div>)}</div></AdminPanel>}
function Reports(){return <AdminPanel title="Reports & analytics" description="Sample platform trends for operational planning."><div className="grid gap-4 sm:grid-cols-3">{[['Completion rate','78%'],['Provider growth','+18%'],['Popular category','Mortuary']].map(([l,v])=><div key={l} className="rounded-2xl bg-[#f5f0e8] p-5"><p className="text-sm text-[#697586]">{l}</p><p className="mt-2 font-serif text-2xl text-[#172b4d]">{v}</p></div>)}</div><div className="mt-6 rounded-2xl border border-[#e8e4dd] p-6"><h3 className="font-serif text-2xl text-[#172b4d]">Platform growth</h3><div className="mt-8 flex h-48 items-end gap-3">{[34,45,42,57,64,78,90].map((v,i)=><div key={i} className="flex flex-1 flex-col items-center gap-2"><div className="w-full rounded-t-lg bg-[#b49a62]" style={{height:`${v}%`}}/><span className="text-[10px] text-[#697586]">{['May','Jun','Jul','Aug','Sep','Oct','Nov'][i]}</span></div>)}</div></div></AdminPanel>}
function AdminSettings({onSave}:{onSave:()=>void}){return <AdminPanel title="Settings" description="Manage administrator preferences and platform information."><div className="grid max-w-2xl gap-4 sm:grid-cols-2"><label className="field">Admin name<input defaultValue="Farewell Admin"/></label><label className="field">Admin email<input defaultValue="admin@farewellconnect.rw" type="email"/></label><label className="field">Platform name<input defaultValue="Farewell Connect"/></label><label className="field">Support email<input defaultValue="hello@farewellconnect.rw"/></label></div><div className="mt-5 flex flex-col gap-3"><label className="flex items-center gap-3 text-sm"><input type="checkbox" defaultChecked className="accent-[#172b4d]"/> Receive operational notifications</label><label className="flex items-center gap-3 text-sm"><input type="checkbox" defaultChecked className="accent-[#172b4d]"/> Require approval for new providers</label></div><button onClick={onSave} className="mt-6 rounded-full bg-[#172b4d] px-5 py-3 text-sm font-semibold text-white">Save changes</button></AdminPanel>}
function AdminPanel({title,description,children}:{title:string;description:string;children:React.ReactNode}){return <div className="rounded-2xl border border-[#e8e4dd] bg-white p-6 shadow-sm sm:p-8"><h3 className="font-serif text-3xl text-[#172b4d]">{title}</h3><p className="mt-2 text-sm text-[#697586]">{description}</p><div className="mt-7">{children}</div></div>}
function AdminSearch({value,onChange,placeholder}:{value:string;onChange:(x:string)=>void;placeholder:string}){return <label className="flex max-w-md items-center gap-3 rounded-xl border border-[#e8e4dd] bg-[#fbfaf7] px-4"><Search className="size-4 text-[#697586]"/><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent py-3 text-sm outline-none"/></label>}
function Status({text}:{text:string}){return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${['Verified','Active','Completed','Successful','Resolved','Accepted','Confirmed'].includes(text)?'bg-[#e6f0e8] text-[#58725f]':text==='Under review'||text==='Pending'||text==='Investigating'||text==='Open'?'bg-[#f4ead0] text-[#816c37]':'bg-[#f1e5e3] text-[#8a5b55]'}`}>{text}</span>}

export {
  AdminDashboard,
  CustomerRegistrationPage,
  LoginPage,
  ProviderPortal,
  SimplePage,
}
