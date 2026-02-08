import { apiRequest } from './http'
import type { ArtistResponse } from './types'

export function listArtists(query: { skip?: number; limit?: number }) {
  return apiRequest<ArtistResponse[]>('/artists/', { query })
}

export function getTopArtists(query: { limit?: number }) {
  return apiRequest<ArtistResponse[]>('/artists/top', { query })
}

export function getArtist(id: number) {
  return apiRequest<ArtistResponse>(`/artists/${id}`)
}

export function createArtist(body: { name: string; bio?: string | null; image_url?: string | null }) {
  return apiRequest<ArtistResponse>('/artists/', { method: 'POST', body })
}

export function updateArtist(id: number, body: { name?: string; bio?: string | null; image_url?: string | null }) {
  return apiRequest<ArtistResponse>(`/artists/${id}`, { method: 'PUT', body })
}
