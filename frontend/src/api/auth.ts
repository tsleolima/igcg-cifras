import { apiRequest } from './http'
import type { TokenResponse, UserResponse } from './types'

export function registerUser(body: { email: string; username: string; password: string; full_name?: string | null }) {
  return apiRequest<UserResponse>('/auth/register', { method: 'POST', auth: false, body })
}

export function login(body: { email: string; password: string }) {
  return apiRequest<TokenResponse>('/auth/login', { method: 'POST', auth: false, body })
}

export function refresh(body: { refresh_token: string }) {
  return apiRequest<TokenResponse>('/auth/refresh', { method: 'POST', auth: false, body })
}
