'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Flower2 } from 'lucide-react'
import { useAuth } from '@/app/providers'
import { apiUrl, isRecord, parseApiResponse } from '@/lib/api'

type AvailabilityStatus = 'available' | 'by_request' | 'unavailable'

type ServiceCategory = {
  id: string
  category_name: string
  slug: string
  description: string | null
}

type ProviderService = {
  id: string
  provider_id: string
  category_id: string
  category_name: string
  service_name: string
  slug: string
  description: string | null
  price: string | number
  currency: string
  pricing_type: string
  location: string | null
  district: string | null
  availability_status: AvailabilityStatus
  is_active: number | boolean
  created_at: string
  updated_at: string
}

type ServiceFormValues = {
  service_name: string
  category_id: string
  description: string
  price: string
  currency: string
  pricing_type: string
  location: string
  district: string
  availability_status: AvailabilityStatus
}

type ProviderServiceManagementProps = {
  mode: 'list' | 'create'
  onNotice: (message: string) => void
  onCreated: () => void
  onAddService: () => void
  onCancelCreate: () => void
}

const serviceStatuses: AvailabilityStatus[] = ['available', 'by_request', 'unavailable']

function isServiceCategory(value: unknown): value is ServiceCategory {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.category_name === 'string'
    && typeof value.slug === 'string'
    && (typeof value.description === 'string' || value.description === null)
}

function isProviderService(value: unknown): value is ProviderService {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.provider_id === 'string'
    && typeof value.category_id === 'string'
    && typeof value.category_name === 'string'
    && typeof value.service_name === 'string'
    && typeof value.slug === 'string'
    && (typeof value.description === 'string' || value.description === null)
    && (typeof value.price === 'string' || typeof value.price === 'number')
    && typeof value.currency === 'string'
    && typeof value.pricing_type === 'string'
    && (typeof value.location === 'string' || value.location === null)
    && (typeof value.district === 'string' || value.district === null)
    && serviceStatuses.includes(value.availability_status as AvailabilityStatus)
    && (typeof value.is_active === 'number' || typeof value.is_active === 'boolean')
    && typeof value.created_at === 'string'
    && typeof value.updated_at === 'string'
}

function isServiceActive(service: ProviderService) {
  return service.is_active === true || Number(service.is_active) === 1
}

function apiErrorMessage(status: number, payload: unknown) {
  const message = isRecord(payload) && typeof payload.message === 'string'
    ? payload.message
    : ({
        401: 'Your session has expired. Please sign in again.',
        403: 'You are not authorized to perform this action. Provider verification may be required.',
        404: 'The service could not be found. Refresh the list and try again.',
        409: 'This service conflicts with an existing listing. Review the details and try again.',
        422: 'The server could not process these service details. Review the form and try again.',
        500: 'The service could not be saved because of a server error. Please try again later.',
      }[status] ?? 'The request could not be completed. Please try again.')

  const details = isRecord(payload) && Array.isArray(payload.errors)
    ? payload.errors.flatMap((item) => {
        if (!isRecord(item) || typeof item.message !== 'string') return []
        return [`${typeof item.field === 'string' ? `${item.field}: ` : ''}${item.message}`]
      })
    : []

  return [message, ...details].join(' ')
}

function categoryLoadErrorMessage(status: number, payload: unknown) {
  const serviceIdValidationError = isRecord(payload)
    && Array.isArray(payload.errors)
    && payload.errors.some((item) =>
      isRecord(item)
      && item.field === 'serviceId'
      && item.message === 'Service ID must be a positive integer.',
    )

  if (status === 400 && serviceIdValidationError) {
    return 'The backend is routing the categories request as a service ID. Deploy the services route with GET /categories registered before /:serviceId.'
  }

  return apiErrorMessage(status, payload)
}

function isSuccessResponse(payload: unknown): payload is Record<string, unknown> {
  return isRecord(payload) && payload.success === true
}

function emptyFormValues(service?: ProviderService): ServiceFormValues {
  return {
    service_name: service?.service_name ?? '',
    category_id: service?.category_id ?? '',
    description: service?.description ?? '',
    price: String(service?.price ?? ''),
    currency: service?.currency ?? 'RWF',
    pricing_type: service?.pricing_type ?? 'fixed',
    location: service?.location ?? '',
    district: service?.district ?? '',
    availability_status: service?.availability_status ?? 'available',
  }
}

function validateForm(values: ServiceFormValues, categories: ServiceCategory[]) {
  if (!values.service_name.trim()) return 'Enter a service name.'
  if (values.service_name.trim().length > 200) return 'Service name must be 200 characters or fewer.'
  if (!categories.some((category) => category.id === values.category_id)) return 'Select an active service category.'
  if (values.description.length > 5000) return 'Description must be 5000 characters or fewer.'
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(values.price)) return 'Enter a non-negative price with up to 2 decimal places.'
  if (!/^[A-Za-z]{3}$/.test(values.currency.trim())) return 'Currency must be a three-letter code.'
  if (!values.pricing_type.trim() || values.pricing_type.trim().length > 30) return 'Pricing type must be 1 to 30 characters.'
  if (values.location.length > 255) return 'Location must be 255 characters or fewer.'
  if (values.district.length > 100) return 'District must be 100 characters or fewer.'
  if (!serviceStatuses.includes(values.availability_status)) return 'Choose a valid availability status.'
  return null
}

export function ProviderServiceManagement({
  mode,
  onNotice,
  onCreated,
  onAddService,
  onCancelCreate,
}: ProviderServiceManagementProps) {
  const { token } = useAuth()
  const [services, setServices] = useState<ProviderService[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [mutationError, setMutationError] = useState('')
  const [mutationBusy, setMutationBusy] = useState(false)
  const [editingService, setEditingService] = useState<ProviderService | null>(null)
  const mutationLock = useRef(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadServices() {
      setLoading(true)
      setLoadError('')
      if (!token) {
        setLoadError('Your session is unavailable. Please sign in again.')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(apiUrl('/api/services/my'), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        const payload = await parseApiResponse(response)
        if (!response.ok) throw new Error(categoryLoadErrorMessage(response.status, payload))
        if (
          !isSuccessResponse(payload)
          || !Array.isArray(payload.services)
          || !payload.services.every(isProviderService)
        ) {
          throw new Error('The server returned an invalid services response.')
        }
        setServices(payload.services)
      } catch (reason) {
        if (controller.signal.aborted) return
        setLoadError(reason instanceof Error ? reason.message : 'Could not load your services.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadServices()
    return () => controller.abort()
  }, [token, refreshKey])

  const performMutation = useCallback(async (
    path: string,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    body: Record<string, unknown> | undefined,
    successMessage: string,
    expectService = true,
  ) => {
    if (mutationLock.current) return false
    setMutationError('')
    if (!token) {
      setMutationError('Your session is unavailable. Please sign in again.')
      return false
    }

    mutationLock.current = true
    setMutationBusy(true)
    try {
      const response = await fetch(apiUrl(path), {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      const payload = await parseApiResponse(response)
      if (!response.ok) throw new Error(apiErrorMessage(response.status, payload))
      if (!isSuccessResponse(payload) || (expectService && !isProviderService(payload.service))) {
        throw new Error('The server returned an invalid service response.')
      }

      setRefreshKey((current) => current + 1)
      onNotice(successMessage)
      return true
    } catch (reason) {
      setMutationError(reason instanceof Error ? reason.message : 'The service action could not be completed.')
      return false
    } finally {
      mutationLock.current = false
      setMutationBusy(false)
    }
  }, [onNotice, token])

  async function createService(values: ServiceFormValues, isActive: boolean) {
    const created = await performMutation('/api/services', 'POST', {
      ...values,
      service_name: values.service_name.trim(),
      category_id: values.category_id.trim(),
      description: values.description.trim() || null,
      price: values.price.trim(),
      currency: values.currency.trim().toUpperCase(),
      pricing_type: values.pricing_type.trim(),
      location: values.location.trim() || null,
      district: values.district.trim() || null,
      is_active: isActive,
    }, 'Service created successfully.')

    if (created) onCreated()
  }

  async function updateService(service: ProviderService, values: ServiceFormValues) {
    const updated = await performMutation(`/api/services/${encodeURIComponent(service.id)}`, 'PUT', {
      ...values,
      service_name: values.service_name.trim(),
      category_id: values.category_id.trim(),
      description: values.description.trim() || null,
      price: values.price.trim(),
      currency: values.currency.trim().toUpperCase(),
      pricing_type: values.pricing_type.trim(),
      location: values.location.trim() || null,
      district: values.district.trim() || null,
    }, 'Service updated successfully.')

    if (updated) setEditingService(null)
  }

  async function updateStatus(service: ProviderService) {
    const status = isServiceActive(service) ? 'inactive' : 'active'
    await performMutation(
      `/api/services/${encodeURIComponent(service.id)}/status`,
      'PATCH',
      { status },
      `Service ${status === 'active' ? 'activated' : 'deactivated'} successfully.`,
    )
  }

  async function deleteService(service: ProviderService) {
    if (!window.confirm(`Delete "${service.service_name}"? This cannot be undone.`)) return
    const deleted = await performMutation(
      `/api/services/${encodeURIComponent(service.id)}`,
      'DELETE',
      undefined,
      'Service deleted successfully.',
      false,
    )
    if (deleted && editingService?.id === service.id) setEditingService(null)
  }

  if (mode === 'create') {
    return (
      <ServiceForm
        key="create"
        title="Add a new service"
        description="Create a service listing for families to discover."
        submitting={mutationBusy}
        error={mutationError}
        onSubmit={createService}
        onCancel={onCancelCreate}
      />
    )
  }

  return (
    <div className="space-y-5">
      {mutationError && <p role="alert" className="rounded-xl border border-[#ecd7d3] bg-white p-4 text-sm text-[#8a5b55]">{mutationError}</p>}

      {editingService && (
        <ServiceForm
          key={editingService.id}
          title="Edit service"
          description="Update the details saved for this service."
          service={editingService}
          submitting={mutationBusy}
          error={mutationError}
          onSubmit={(values) => updateService(editingService, values)}
          onCancel={() => {
            setEditingService(null)
            setMutationError('')
          }}
        />
      )}

      {loading ? (
        <div role="status" className="rounded-2xl border border-[#e8e4dd] bg-white p-8 text-center text-sm text-[#697586]">
          Loading your services…
        </div>
      ) : loadError ? (
        <div className="rounded-2xl border border-[#ecd7d3] bg-white p-8 text-center">
          <p role="alert" className="text-sm text-[#8a5b55]">{loadError}</p>
          <button
            type="button"
            onClick={() => setRefreshKey((current) => current + 1)}
            className="mt-4 rounded-full border border-[#d9cfbd] px-5 py-2.5 text-sm font-semibold text-[#172b4d]"
          >
            Retry
          </button>
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-2xl border border-[#e8e4dd] bg-white p-8 text-center">
          <h3 className="font-serif text-2xl text-[#172b4d]">No services yet</h3>
          <p className="mt-2 text-sm text-[#697586]">Create your first service listing to get started.</p>
          <button
            type="button"
            onClick={onAddService}
            className="mt-5 rounded-full bg-[#172b4d] px-5 py-3 text-sm font-semibold text-white"
          >
            Add a service
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => {
            const active = isServiceActive(service)
            return (
              <article key={service.id} className="rounded-2xl border border-[#e8e4dd] bg-white p-5 shadow-sm">
                <div className="flex h-28 items-center justify-center rounded-xl bg-[#f5f0e8]">
                  <Flower2 className="size-10 text-[#b49a62]" />
                </div>
                <div className="mt-5 flex justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-xl text-[#172b4d]">{service.service_name}</h3>
                    <p className="mt-1 text-xs text-[#697586]">{service.category_name}</p>
                  </div>
                  <span className={`h-fit rounded-full px-2 py-1 text-[10px] font-semibold ${active ? 'bg-[#e6f0e8] text-[#58725f]' : 'bg-[#f4ead0] text-[#816c37]'}`}>
                    {active ? 'Active' : 'Draft'}
                  </span>
                </div>
                <p className="mt-4 text-sm font-semibold text-[#172b4d]">{service.price} {service.currency}</p>
                <p className="mt-1 text-xs text-[#697586]">
                  {[service.availability_status.replace('_', ' '), service.location, service.district].filter(Boolean).join(' · ')}
                </p>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-[#eeeae3] pt-4">
                  <button
                    type="button"
                    disabled={mutationBusy}
                    onClick={() => setEditingService(service)}
                    className="rounded-full border border-[#d9cfbd] px-3 py-2 text-xs font-semibold disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={mutationBusy}
                    onClick={() => void updateStatus(service)}
                    className="flex-1 rounded-full border border-[#d9cfbd] px-3 py-2 text-xs font-semibold disabled:opacity-50"
                  >
                    {mutationBusy ? 'Saving…' : active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    disabled={mutationBusy}
                    onClick={() => void deleteService(service)}
                    className="rounded-full border border-[#ecd7d3] px-3 py-2 text-xs font-semibold text-[#8a5b55] disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ServiceForm({
  title,
  description,
  service,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  title: string
  description: string
  service?: ProviderService
  submitting: boolean
  error: string
  onSubmit: (values: ServiceFormValues, isActive: boolean) => Promise<void>
  onCancel: () => void
}) {
  const { token } = useAuth()
  const [values, setValues] = useState(() => emptyFormValues(service))
  const [publishActive, setPublishActive] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState('')
  const [categoriesRetry, setCategoriesRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadCategories() {
      setCategoriesLoading(true)
      setCategoriesError('')
      if (!token) {
        setCategoriesError('Your session is unavailable. Please sign in again.')
        setCategoriesLoading(false)
        return
      }

      try {
        const response = await fetch(apiUrl('/api/services/categories'), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        const payload = await parseApiResponse(response)
        if (!response.ok) throw new Error(apiErrorMessage(response.status, payload))
        if (
          !isSuccessResponse(payload)
          || !Array.isArray(payload.categories)
          || !payload.categories.every(isServiceCategory)
        ) {
          throw new Error('The server returned an invalid categories response.')
        }
        setCategories(payload.categories)
      } catch (reason) {
        if (controller.signal.aborted) return
        setCategoriesError(reason instanceof Error ? reason.message : 'Could not load service categories.')
      } finally {
        if (!controller.signal.aborted) setCategoriesLoading(false)
      }
    }

    void loadCategories()
    return () => controller.abort()
  }, [token, categoriesRetry])

  useEffect(() => {
    if (
      !categoriesLoading
      && !categoriesError
      && values.category_id
      && !categories.some((category) => category.id === values.category_id)
    ) {
      setValues((current) => ({ ...current, category_id: '' }))
    }
  }, [categories, categoriesError, categoriesLoading, values.category_id])

  function updateField<K extends keyof ServiceFormValues>(field: K, value: ServiceFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationMessage = validateForm(values, categories)
    if (validationMessage) {
      setValidationError(validationMessage)
      return
    }
    setValidationError('')
    await onSubmit(values, service ? false : publishActive)
  }

  return (
    <section className="rounded-2xl border border-[#e8e4dd] bg-white p-6 shadow-sm sm:p-8">
      <h3 className="font-serif text-3xl text-[#172b4d]">{title}</h3>
      <p className="mt-2 text-sm text-[#697586]">{description}</p>
      <form onSubmit={submit} className="mt-7 grid gap-5 sm:grid-cols-2">
        <label className="field">
          Service name
          <input
            value={values.service_name}
            onChange={(event) => updateField('service_name', event.target.value)}
            maxLength={200}
            placeholder="e.g. Memorial ceremony coordination"
            required
          />
        </label>
        <label className="field">
          Category
          <select
            value={values.category_id}
            onChange={(event) => updateField('category_id', event.target.value)}
            disabled={categoriesLoading || Boolean(categoriesError) || categories.length === 0 || submitting}
            required
          >
            <option value="">
              {categoriesLoading ? 'Loading categories…' : categoriesError ? 'Categories unavailable' : 'Select a category'}
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.category_name}</option>
            ))}
          </select>
          {categoriesLoading && <span role="status" className="text-xs font-normal text-[#697586]">Loading active categories…</span>}
          {categoriesError && (
            <span className="flex flex-wrap items-center gap-2 text-xs font-normal text-[#8a5b55]">
              <span role="alert">{categoriesError}</span>
              <button
                type="button"
                onClick={() => setCategoriesRetry((count) => count + 1)}
                className="font-semibold text-[#172b4d] underline"
              >
                Retry
              </button>
            </span>
          )}
          {!categoriesLoading && !categoriesError && categories.length === 0 && (
            <span role="status" className="text-xs font-normal text-[#697586]">No active service categories are available.</span>
          )}
        </label>
        <label className="field sm:col-span-2">
          Description
          <textarea
            value={values.description}
            onChange={(event) => updateField('description', event.target.value)}
            maxLength={5000}
            placeholder="Describe what families can expect"
            required
          />
        </label>
        <label className="field">
          Price
          <input
            value={values.price}
            onChange={(event) => updateField('price', event.target.value)}
            inputMode="decimal"
            placeholder="280000"
            required
          />
        </label>
        <label className="field">
          Currency
          <input
            value={values.currency}
            onChange={(event) => updateField('currency', event.target.value.toUpperCase())}
            maxLength={3}
            placeholder="RWF"
            required
          />
        </label>
        <label className="field">
          Pricing type
          <input
            value={values.pricing_type}
            onChange={(event) => updateField('pricing_type', event.target.value)}
            maxLength={30}
            placeholder="fixed"
            required
          />
        </label>
        <label className="field">
          Availability
          <select
            value={values.availability_status}
            onChange={(event) => updateField('availability_status', event.target.value as AvailabilityStatus)}
          >
            <option value="available">Available</option>
            <option value="by_request">By request</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </label>
        <label className="field">
          Service location
          <input
            value={values.location}
            onChange={(event) => updateField('location', event.target.value)}
            maxLength={255}
            placeholder="Kigali"
          />
        </label>
        <label className="field">
          District
          <input
            value={values.district}
            onChange={(event) => updateField('district', event.target.value)}
            maxLength={100}
            placeholder="Kicukiro"
          />
        </label>
        {!service && (
          <label className="flex items-start gap-3 text-sm text-[#536172] sm:col-span-2">
            <input
              type="checkbox"
              checked={publishActive}
              onChange={(event) => setPublishActive(event.target.checked)}
              className="mt-1 accent-[#172b4d]"
            />
            <span>
              Publish as active
              <span className="mt-1 block text-xs text-[#697586]">The backend checks provider verification before allowing an active listing.</span>
            </span>
          </label>
        )}
        {(validationError || error) && (
          <p role="alert" className="rounded-xl border border-[#ecd7d3] bg-[#fffafa] p-3 text-sm text-[#8a5b55] sm:col-span-2">
            {validationError || error}
          </p>
        )}
        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={
              submitting
              || categoriesLoading
              || Boolean(categoriesError)
              || !categories.some((category) => category.id === values.category_id)
            }
            className="rounded-full bg-[#172b4d] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Saving…' : service ? 'Save changes' : 'Create service'}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onCancel}
            className="rounded-full border border-[#d9cfbd] px-5 py-3 text-sm font-semibold text-[#172b4d] disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  )
}
