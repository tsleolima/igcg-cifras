import { apiRequest } from './http'
import type { SongHymnDetailResponse, SongHymnListResponse } from './types'

export function listSongs(query: {
  skip?: number
  limit?: number
  language?: string
  genre?: string
  album_id?: number
  artist_id?: number
  favorites_only?: boolean
}) {
  return apiRequest<SongHymnListResponse[]>('/songs/', { query })
}

export function getTopSongs(query: { limit?: number }) {
  return apiRequest<SongHymnListResponse[]>('/songs/top', { query })
}

export function getSong(id: number) {
  return apiRequest<SongHymnDetailResponse>(`/songs/${id}`)
}

export function incrementPlay(id: number) {
  return apiRequest<{ message: string; play_count: number }>(`/songs/${id}/play`, { method: 'POST' })
}

export function getLyrics(id: number, query: { include_chords?: boolean }) {
  return apiRequest<{ song_id: number; title: string; artist: string | null; album: string | null; language: string | null; lyrics: string | null; has_chords: boolean }>(
    `/songs/${id}/lyrics`,
    { query },
  )
}

export function createSong(body: {
  title: string
  duration: number
  audio_url: string
  cover_url?: string | null
  lyrics?: string | null
  lyrics_with_chords?: string | null
  language?: string | null
  genre?: string | null
  album_id?: number | null
}) {
  return apiRequest<SongHymnDetailResponse>('/songs/', { method: 'POST', body })
}

export function updateSong(id: number, body: {
  title?: string
  duration?: number
  audio_url?: string
  cover_url?: string | null
  lyrics?: string | null
  lyrics_with_chords?: string | null
  language?: string | null
  genre?: string | null
}) {
  return apiRequest<SongHymnDetailResponse>(`/songs/${id}`, { method: 'PUT', body })
}
