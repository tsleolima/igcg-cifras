import { apiRequest } from './http'
import type { UserResponse } from './types'

export function getMe() {
  return apiRequest<UserResponse>('/users/me')
}

export function updateMe(body: {
  email?: string
  username?: string
  full_name?: string | null
  avatar_url?: string | null
  password?: string | null
}) {
  return apiRequest<UserResponse>('/users/me', { method: 'PUT', body })
}
