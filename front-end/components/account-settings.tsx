'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth, type AuthUser } from '@/app/providers'
import { apiUrl, isRecord, parseApiResponse } from '@/lib/api'

function isAccountUser(value: unknown): value is AuthUser {
  return isRecord(value)
    && (typeof value.id === 'string' || typeof value.id === 'number')
    && (value.role === 'customer' || value.role === 'provider' || value.role === 'admin')
    && typeof value.username === 'string'
    && typeof value.full_name === 'string'
    && (value.email === null || typeof value.email === 'string')
}

function responseMessage(payload: unknown, fallback: string) {
  return isRecord(payload) && typeof payload.message === 'string' ? payload.message : fallback
}

export function AccountSettings() {
  const { token, user, updateUser, logout } = useAuth()
  const [username, setUsername] = useState(user?.username ?? '')
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordVisibility, setPasswordVisibility] = useState({
    current: false,
    next: false,
    confirm: false,
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  useEffect(() => {
    setUsername(user?.username ?? '')
    setFullName(user?.full_name ?? '')
  }, [user?.id, user?.username, user?.full_name])

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (profileLoading || !token) return

    setProfileLoading(true)
    setProfileError('')
    setProfileSuccess('')
    try {
      const response = await fetch(apiUrl('/api/users/me'), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, full_name: fullName }),
      })
      const payload = await parseApiResponse(response)
      if (!response.ok) throw new Error(responseMessage(payload, 'Could not save your profile.'))
      if (!isRecord(payload) || !isAccountUser(payload.user)) {
        throw new Error('The server returned an invalid account profile.')
      }

      updateUser(payload.user)
      setProfileSuccess('Your account profile has been updated.')
    } catch (reason) {
      setProfileError(reason instanceof Error ? reason.message : 'Could not save your profile.')
    } finally {
      setProfileLoading(false)
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (passwordLoading || !token) return

    setPasswordError('')
    setPasswordSuccess('')
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.')
      return
    }

    setPasswordLoading(true)
    try {
      const response = await fetch(apiUrl('/api/users/me/password'), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      })
      const payload = await parseApiResponse(response)
      if (!response.ok) throw new Error(responseMessage(payload, 'Could not change your password.'))

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSuccess(responseMessage(payload, 'Password changed. Please sign in again.'))
      window.setTimeout(() => logout('/login'), 1500)
    } catch (reason) {
      setPasswordError(reason instanceof Error ? reason.message : 'Could not change your password.')
    } finally {
      setPasswordLoading(false)
    }
  }

  function toggleVisibility(field: keyof typeof passwordVisibility) {
    setPasswordVisibility((current) => ({ ...current, [field]: !current[field] }))
  }

  function passwordField(
    field: keyof typeof passwordVisibility,
    label: string,
    value: string,
    setValue: (value: string) => void,
    autoComplete: 'current-password' | 'new-password',
  ) {
    return (
      <label className="field">
        {label}
        <span className="relative block">
          <input
            type={passwordVisibility[field] ? 'text' : 'password'}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoComplete={autoComplete}
            required
            maxLength={72}
            className="pr-12"
          />
          <button
            type="button"
            aria-label={`${passwordVisibility[field] ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
            onClick={() => toggleVisibility(field)}
            className="absolute inset-y-0 right-3 my-auto grid size-8 place-items-center text-[#697586]"
          >
            {passwordVisibility[field] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </span>
      </label>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <section className="rounded-2xl border border-[#e8e4dd] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#b49a62]">Account settings</p>
        <h2 className="mt-2 font-serif text-3xl text-[#172b4d]">Personal account</h2>
        <p className="mt-2 text-sm leading-6 text-[#697586]">
          Update your sign-in username and personal name. Provider business details are managed separately.
        </p>
        <form onSubmit={saveProfile} className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="field">
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              minLength={3}
              maxLength={30}
              pattern="[A-Za-z0-9._-]{3,30}"
              required
            />
            <span className="text-xs font-normal text-[#697586]">3–30 letters, numbers, dots, underscores or hyphens.</span>
          </label>
          <label className="field">
            Personal name
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
              maxLength={150}
              required
            />
          </label>
          {profileError && <p role="alert" className="text-sm text-[#8a5b55] sm:col-span-2">{profileError}</p>}
          {profileSuccess && <p role="status" className="text-sm text-[#58725f] sm:col-span-2">{profileSuccess}</p>}
          <button
            type="submit"
            disabled={profileLoading || !token}
            className="w-fit rounded-full bg-[#172b4d] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
          >
            {profileLoading ? 'Saving profile…' : 'Save Profile'}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-[#e8e4dd] bg-white p-6 shadow-sm sm:p-8">
        <h2 className="font-serif text-3xl text-[#172b4d]">Change password</h2>
        <p className="mt-2 text-sm leading-6 text-[#697586]">
          Use at least 12 characters with an uppercase letter, a lowercase letter, and a number.
          This browser will sign out after the password changes.
        </p>
        <form onSubmit={changePassword} className="mt-6 grid gap-5">
          {passwordField('current', 'Current password', currentPassword, setCurrentPassword, 'current-password')}
          {passwordField('next', 'New password', newPassword, setNewPassword, 'new-password')}
          {passwordField('confirm', 'Confirm new password', confirmPassword, setConfirmPassword, 'new-password')}
          {passwordError && <p role="alert" className="text-sm text-[#8a5b55]">{passwordError}</p>}
          {passwordSuccess && <p role="status" className="text-sm text-[#58725f]">{passwordSuccess}</p>}
          <button
            type="submit"
            disabled={passwordLoading || !token}
            className="w-fit rounded-full bg-[#172b4d] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {passwordLoading ? 'Changing password…' : 'Change Password'}
          </button>
        </form>
      </section>
    </div>
  )
}
