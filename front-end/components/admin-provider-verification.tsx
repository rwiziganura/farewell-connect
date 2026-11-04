'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/app/providers'
import { apiUrl, isRecord, parseApiResponse } from '@/lib/api'

type ProviderApplication = {
  provider_id: string
  user_id: string
  full_name: string
  user_email: string | null
  user_phone: string | null
  business_name: string
  business_phone: string | null
  business_email: string | null
  business_address: string | null
  province: string | null
  district: string | null
  sector: string | null
  business_registration_number: string | null
  verification_status: string
  verification_notes: string | null
  verified_at: string | null
  verified_by: string | null
  application_submitted_at: string | null
  updated_at: string | null
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isProviderApplication(value: unknown): value is ProviderApplication {
  if (!isRecord(value)) return false

  const requiredStrings = [
    'provider_id',
    'user_id',
    'full_name',
    'business_name',
    'verification_status',
  ] as const
  const optionalStrings = [
    'user_email',
    'user_phone',
    'business_phone',
    'business_email',
    'business_address',
    'province',
    'district',
    'sector',
    'business_registration_number',
    'verification_notes',
    'verified_at',
    'verified_by',
    'application_submitted_at',
    'updated_at',
  ] as const

  return requiredStrings.every((field) => typeof value[field] === 'string')
    && optionalStrings.every((field) => isNullableString(value[field]))
}

function getApiError(status: number, payload: unknown): Error {
  if (isRecord(payload)) {
    const message = typeof payload.message === 'string' ? payload.message : ''
    const details = Array.isArray(payload.errors)
      ? payload.errors
        .filter(isRecord)
        .map((item) => typeof item.message === 'string' ? item.message : null)
        .filter((item): item is string => item !== null)
      : []
    if (message) return new Error([message, ...details].join(' '))
  }

  const messages: Record<number, string> = {
    401: 'Your admin session is no longer valid. Log in again.',
    403: 'Your account is not authorized to manage provider applications.',
    404: 'The provider application could not be found. Refresh the list and try again.',
    409: 'This application has already been reviewed. Refresh the list.',
    422: 'The request was invalid. Check the rejection reason and try again.',
    500: 'The server could not process this request. Please try again later.',
  }
  return new Error(messages[status] || `The request failed (${status}). Please try again.`)
}

function formatDate(value: string | null): string {
  if (!value) return 'Not provided'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-[#697586]">{label}</dt>
      <dd className="mt-1 break-words text-sm text-[#536172]">{value || 'Not provided'}</dd>
    </div>
  )
}

export function AdminProviderVerification({ onAction }: { onAction: (message: string) => void }) {
  const { token } = useAuth()
  const [applications, setApplications] = useState<ProviderApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submittingProviderId, setSubmittingProviderId] = useState<string | null>(null)
  const [rejectingProviderId, setRejectingProviderId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const loadApplications = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      if (!token) throw new Error('Your admin session is unavailable. Log in again.')

      const response = await fetch(apiUrl('/api/admin/providers/pending'), {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      })
      const payload = await parseApiResponse(response)
      if (!response.ok) throw getApiError(response.status, payload)
      if (!isRecord(payload) || payload.success !== true || !Array.isArray(payload.providers)) {
        throw new Error('The server returned an invalid provider application list.')
      }
      if (!payload.providers.every(isProviderApplication)) {
        throw new Error('The server returned provider application data in an unexpected format.')
      }
      setApplications(payload.providers)
    } catch (reason) {
      if (signal?.aborted) return
      setError(reason instanceof Error ? reason.message : 'Could not load provider applications.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [token])

  useEffect(() => {
    const controller = new AbortController()
    void loadApplications(controller.signal)
    return () => controller.abort()
  }, [loadApplications])

  const submitDecision = async (provider: ProviderApplication, decision: 'approve' | 'reject') => {
    if (!token || submittingProviderId) return
    const reason = rejectionReason.trim()
    if (decision === 'reject' && !reason) {
      setError('Enter a rejection reason before rejecting this application.')
      return
    }

    setSubmittingProviderId(provider.provider_id)
    setError('')
    try {
      const response = await fetch(
        apiUrl(`/api/admin/providers/${encodeURIComponent(provider.provider_id)}/${decision}`),
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            ...(decision === 'reject' ? { 'Content-Type': 'application/json' } : {}),
          },
          ...(decision === 'reject' ? { body: JSON.stringify({ reason }) } : {}),
        },
      )
      const payload = await parseApiResponse(response)
      if (!response.ok) throw getApiError(response.status, payload)
      if (!isRecord(payload) || payload.success !== true) {
        throw new Error('The server did not confirm the provider application update.')
      }

      onAction(decision === 'approve'
        ? `${provider.business_name} was approved.`
        : `${provider.business_name} was rejected.`)
      setRejectingProviderId(null)
      setRejectionReason('')
      await loadApplications()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update this provider application.')
    } finally {
      setSubmittingProviderId(null)
    }
  }

  return (
    <div className="rounded-2xl border border-[#e8e4dd] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-serif text-3xl text-[#172b4d]">Provider verification center</h3>
          <p className="mt-2 text-sm text-[#697586]">Review provider applications before granting verified status.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadApplications()}
          disabled={loading || submittingProviderId !== null || !token}
          className="rounded-full border border-[#d9cfbd] px-4 py-2 text-xs font-semibold text-[#172b4d] disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div role="alert" className="mt-5 rounded-xl bg-[#f1e5e3] p-4 text-sm text-[#8a5b55]">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void loadApplications()}
            disabled={loading || !token}
            className="mt-3 font-semibold underline disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <p role="status" className="mt-7 rounded-xl bg-[#f5f0e8] p-5 text-sm text-[#536172]">
          Loading provider applications…
        </p>
      ) : applications.length === 0 && !error ? (
        <p className="mt-7 rounded-xl bg-[#f5f0e8] p-5 text-sm text-[#536172]">
          There are no pending provider applications.
        </p>
      ) : (
        <div className="mt-7 grid gap-5">
          {applications.map((provider) => {
            const submitting = submittingProviderId === provider.provider_id
            const location = [provider.business_address, provider.district, provider.province, provider.sector]
              .filter(Boolean)
              .join(', ')

            return (
              <article key={provider.provider_id} className="rounded-2xl border border-[#e8e4dd] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-[#b49a62]">Application #{provider.provider_id}</p>
                    <h4 className="mt-2 font-serif text-2xl text-[#172b4d]">{provider.business_name}</h4>
                    <p className="mt-1 text-sm text-[#697586]">{provider.full_name}</p>
                  </div>
                  <span className="rounded-full bg-[#f4ead0] px-3 py-1 text-xs font-semibold capitalize text-[#816c37]">
                    {provider.verification_status}
                  </span>
                </div>

                <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Detail label="Account email" value={provider.user_email} />
                  <Detail label="Account phone" value={provider.user_phone} />
                  <Detail label="Business email" value={provider.business_email} />
                  <Detail label="Business phone" value={provider.business_phone} />
                  <Detail label="Business location" value={location || null} />
                  <Detail label="Registration number" value={provider.business_registration_number} />
                  <Detail label="Submitted" value={formatDate(provider.application_submitted_at)} />
                  <Detail label="Verification notes" value={provider.verification_notes} />
                </dl>

                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void submitDecision(provider, 'approve')}
                    disabled={!token || submittingProviderId !== null}
                    className="rounded-full bg-[#172b4d] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {submitting && rejectingProviderId !== provider.provider_id ? 'Approving…' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError('')
                      setRejectingProviderId((current) => current === provider.provider_id ? null : provider.provider_id)
                      setRejectionReason('')
                    }}
                    disabled={!token || submittingProviderId !== null}
                    className="rounded-full border border-[#ecd7d3] px-4 py-2 text-xs font-semibold text-[#8a5b55] disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>

                {rejectingProviderId === provider.provider_id && (
                  <div className="mt-4 rounded-xl bg-[#f5f0e8] p-4">
                    <label className="block text-sm font-medium text-[#172b4d]">
                      Rejection reason
                      <textarea
                        value={rejectionReason}
                        onChange={(event) => setRejectionReason(event.target.value)}
                        maxLength={5000}
                        rows={3}
                        className="mt-2 w-full rounded-xl border border-[#ded9d0] bg-white p-3 text-sm text-[#202a38]"
                        required
                      />
                    </label>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void submitDecision(provider, 'reject')}
                        disabled={!token || submittingProviderId !== null || !rejectionReason.trim()}
                        className="rounded-full bg-[#8a5b55] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {submitting ? 'Rejecting…' : 'Confirm rejection'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingProviderId(null)
                          setRejectionReason('')
                        }}
                        disabled={submitting}
                        className="rounded-full border border-[#d9cfbd] px-4 py-2 text-xs font-semibold text-[#536172] disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
