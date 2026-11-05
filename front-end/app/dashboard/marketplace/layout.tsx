'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { RequireAuth, useAuth } from '@/app/providers'

const navigation = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Marketplace', href: '/dashboard/marketplace' },
  { label: 'My bookings', href: '/dashboard?view=My%20Bookings' },
  { label: 'Saved providers', href: '/dashboard?view=Saved%20Providers' },
  { label: 'Account settings', href: '/dashboard?view=Account%20Settings' },
]

export default function CustomerMarketplaceLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { logout } = useAuth()
  const loginRedirectTo = `/login?redirectTo=${encodeURIComponent(pathname)}`

  return (
    <RequireAuth role="customer" loginRedirectTo={loginRedirectTo}>
      <div className="min-h-screen bg-[#fbfaf7] text-[#202a38]">
        <header className="border-b border-[#e8e4dd] bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-8">
            <Link href="/dashboard" className="font-serif text-lg tracking-[.14em] text-[#172b4d]">
              FAREWELL <span className="text-[#b49a62]">CONNECT</span>
            </Link>
            <nav aria-label="Customer navigation" className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {navigation.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  aria-current={label === 'Marketplace' ? 'page' : undefined}
                  className={`text-sm ${label === 'Marketplace' ? 'font-semibold text-[#172b4d]' : 'text-[#536172] hover:text-[#172b4d]'}`}
                >
                  {label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => logout('/login')}
                className="text-sm font-semibold text-[#8a5b55] hover:text-[#6f3f3a]"
              >
                Log out
              </button>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">{children}</main>
      </div>
    </RequireAuth>
  )
}
