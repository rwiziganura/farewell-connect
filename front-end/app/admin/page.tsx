'use client'

import { AdminDashboard } from '@/components/app-pages'
import { RequireAuth, useAuth } from '@/app/providers'

function AdminLogout() {
  const { logout } = useAuth()

  return (
    <div className="flex justify-end border-b border-[#e6dfd4] bg-white px-5 py-2 sm:px-8">
      <button
        type="button"
        onClick={() => logout()}
        className="rounded-full border border-[#e8e4dd] px-3 py-1.5 text-xs font-semibold text-[#536172] hover:border-[#c0392b] hover:text-[#c0392b]"
      >
        Log out
      </button>
    </div>
  )
}

export default function AdminDashboardRoute() {
  return (
    <RequireAuth role="admin">
      <AdminLogout />
      <AdminDashboard />
    </RequireAuth>
  )
}
