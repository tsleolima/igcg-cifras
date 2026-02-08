import { apiRequest } from './http'
import type { AlbumResponse, SongHymnListResponse } from './types'

export function listAlbums(query: { skip?: number; limit?: number }) {
  return apiRequest<AlbumResponse[]>('/albums/', { query })
}

export async function listAllAlbums(options?: { pageSize?: number; maxPages?: number }) {
  const requestedPageSize = options?.pageSize ?? 100
  const pageSize = Math.min(Math.max(1, requestedPageSize), 100)
  const maxPages = options?.maxPages ?? 200

  const all: AlbumResponse[] = []
  const seenIds = new Set<number>()

  let skip = 0
  for (let page = 0; page < maxPages; page++) {
    const batch = await listAlbums({ skip, limit: pageSize })
    if (!batch?.length) break

    let added = 0
    for (const album of batch) {
      if (seenIds.has(album.id)) continue
      seenIds.add(album.id)
      all.push(album)
      added++
    }

    if (batch.length < pageSize) break
    if (added === 0) break

    skip += pageSize
  }

  return all
}

export function getAlbum(id: number) {
  return apiRequest<AlbumResponse>(`/albums/${id}`)
}

export function getAlbumSongs(id: number) {
  return apiRequest<SongHymnListResponse[]>(`/albums/${id}/songs`)
}

export function createAlbum(body: { title: string; cover_url?: string | null; release_year?: number | null }) {
  return apiRequest<AlbumResponse>('/albums/', { method: 'POST', body })
}

export function updateAlbum(id: number, body: { title?: string; cover_url?: string | null; release_year?: number | null }) {
  return apiRequest<AlbumResponse>(`/albums/${id}`, { method: 'PUT', body })
}
