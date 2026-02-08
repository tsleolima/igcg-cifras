import { apiRequest } from './http'
import type { PlaylistDetailResponse, PlaylistResponse } from './types'

export function listPlaylists(query: { skip?: number; limit?: number; public_only?: boolean }) {
  return apiRequest<PlaylistResponse[]>('/playlists/', { query })
}

export function listMyPlaylists(query: { skip?: number; limit?: number }) {
  return apiRequest<PlaylistResponse[]>('/playlists/my', { query })
}

export function getPlaylist(id: number) {
  return apiRequest<PlaylistDetailResponse>(`/playlists/${id}`)
}

export function createPlaylist(body: { name: string; description?: string | null; cover_url?: string | null; is_public?: boolean }) {
  return apiRequest<PlaylistResponse>('/playlists/', { method: 'POST', body })
}

export function updatePlaylist(id: number, body: { name?: string; description?: string | null; cover_url?: string | null; is_public?: boolean | null }) {
  return apiRequest<PlaylistResponse>(`/playlists/${id}`, { method: 'PUT', body })
}

export function deletePlaylist(id: number) {
  return apiRequest<void>(`/playlists/${id}`, { method: 'DELETE' })
}

export function addSongToPlaylist(playlistId: number, songId: number) {
  return apiRequest<{ message: string; position: number }>(`/playlists/${playlistId}/songs`, {
    method: 'POST',
    body: { song_id: songId },
  })
}

export function removeSongFromPlaylist(playlistId: number, songId: number) {
  return apiRequest<void>(`/playlists/${playlistId}/songs/${songId}`, { method: 'DELETE' })
}

export function reorderPlaylistSongs(playlistId: number, songIds: number[]) {
  return apiRequest<{ message: string; song_count: number }>(`/playlists/${playlistId}/songs/reorder`, {
    method: 'PUT',
    body: { song_ids: songIds },
  })
}
