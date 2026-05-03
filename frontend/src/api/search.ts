import { apiRequest } from './http'
import type {
  ArtistResponse,
  PaginatedResponse,
  PlaylistResponse,
  SearchAllResponse,
  SongHymnListResponse,
} from './types'

export function searchSongs(query: {
  q: string
  page?: number
  page_size?: number
  limit?: number
  fuzzy?: boolean
  min_score?: number
}) {
  return apiRequest<PaginatedResponse<SongHymnListResponse>>('/search/songs', { query })
}

export function searchArtists(query: { q: string; page?: number; page_size?: number; limit?: number }) {
  return apiRequest<PaginatedResponse<ArtistResponse>>('/search/artists', { query })
}

export function searchPlaylists(query: { q: string; page?: number; page_size?: number; limit?: number }) {
  return apiRequest<PaginatedResponse<PlaylistResponse>>('/search/playlists', { query })
}

export function searchAll(query: {
  q: string
  songs_page?: number
  artists_page?: number
  playlists_page?: number
  page_size?: number
  limit_per_type?: number
  fuzzy_songs?: boolean
}) {
  return apiRequest<SearchAllResponse>('/search/all', { query })
}
