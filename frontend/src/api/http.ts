import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './storage'

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || window.location.origin
const API_PREFIX = '/api/v1'

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined | null>): string {
  const url = new URL(`${API_BASE_URL}${API_PREFIX}${path}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function safeReadJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return null
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  const url = buildUrl('/auth/refresh')
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!res.ok) {
    clearTokens()
    return false
  }

  const data = (await res.json()) as { access_token: string; refresh_token: string }
  if (!data?.access_token || !data?.refresh_token) {
    clearTokens()
    return false
  }

  setTokens({ access_token: data.access_token, refresh_token: data.refresh_token })
  return true
}

export async function apiRequest<T>(
  path: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    query?: Record<string, string | number | boolean | undefined | null>
    body?: unknown
    auth?: boolean
    retryOn401?: boolean
  },
): Promise<T> {
  const method = options?.method || 'GET'
  const auth = options?.auth ?? true
  const retryOn401 = options?.retryOn401 ?? true

  const url = buildUrl(path, options?.query)

  const headers: Record<string, string> = {}
  if (options?.body !== undefined) headers['content-type'] = 'application/json'

  if (auth) {
    const token = getAccessToken()
    if (token) headers.authorization = `Bearer ${token}`
  }

  const res = await fetch(url, {
    method,
    headers,
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (res.status === 401 && auth && retryOn401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      return apiRequest<T>(path, { ...options, retryOn401: false })
    }
  }

  if (res.status === 204) {
    return undefined as T
  }

  if (!res.ok) {
    const data = await safeReadJson(res)
    const message =
      (data as any)?.detail ||
      (typeof data === 'string' ? data : null) ||
      `Request failed (${res.status})`
    throw new ApiError(message, res.status, data)
  }

  const json = (await safeReadJson(res)) as T
  return json
}
