export function apiUrl(path: string): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim()
  const baseUrl = configuredUrl || (process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : '')

  if (!baseUrl) {
    throw new Error('Backend API URL is not configured. Set NEXT_PUBLIC_API_URL and restart the frontend.')
  }

  try {
    return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString()
  } catch {
    throw new Error('NEXT_PUBLIC_API_URL is invalid. Check the frontend environment configuration.')
  }
}

export async function parseApiResponse(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new Error('The server returned an invalid response. Please try again later.')
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isJwt(value: unknown): value is string {
  return typeof value === 'string' && value.split('.').length === 3 && value.split('.').every(Boolean)
}
