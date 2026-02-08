import { apiRequest } from './http'
import type { ArtistResponse, PlaylistResponse, SongHymnListResponse } from './types'

export function searchSongs(query: { q: string; limit?: number; fuzzy?: boolean; min_score?: number }) {
  return apiRequest<SongHymnListResponse[]>('/search/songs', { query })
}

export function searchArtists(query: { q: string; limit?: number }) {
  return apiRequest<ArtistResponse[]>('/search/artists', { query })
}

export function searchPlaylists(query: { q: string; limit?: number }) {
  return apiRequest<PlaylistResponse[]>('/search/playlists', { query })
}

export function searchAll(query: { q: string; limit_per_type?: number; fuzzy_songs?: boolean }) {
  return apiRequest<{ songs: SongHymnListResponse[]; artists: ArtistResponse[]; playlists: PlaylistResponse[] }>(
    '/search/all',
    { query },
  )
}
