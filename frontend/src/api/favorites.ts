import { apiRequest } from './http'
import type { SongHymnListResponse } from './types'

export function listFavorites(query: { skip?: number; limit?: number }) {
  return apiRequest<SongHymnListResponse[]>('/favorites/', { query })
}

export function addFavorite(songId: number) {
  return apiRequest(`/favorites/${songId}`, { method: 'POST' })
}

export function removeFavorite(songId: number) {
  return apiRequest<void>(`/favorites/${songId}`, { method: 'DELETE' })
}

export function checkFavorite(songId: number) {
  return apiRequest<{ song_id: number; is_favorited: boolean }>(`/favorites/check/${songId}`)
}
