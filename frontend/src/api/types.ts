export type TokenResponse = {
  access_token: string
  refresh_token: string
  token_type: string
}

export type UserResponse = {
  id: number
  email: string
  username: string
  full_name: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
}

export type SongHymnListResponse = {
  id: number
  title: string
  play_count: number
  categories?: Array<Record<string, any>> | null
  original_key?: string | null
  rhythm?: string | null
  introduction?: string | null
  pdf_view_url?: string | null
  artist_id: number
  artist_name?: string | null
  is_favorited?: boolean
}

export type SongHymnDetailResponse = SongHymnListResponse & {
  cifra_content?: string | null
  lyrics_with_chords?: string | null
}

export type AlbumResponse = {
  id: number
  title: string
  cover_url: string | null
  release_year: number | null
  artist_id: number
  created_at: string
}

export type ArtistResponse = {
  id: number
  name: string
  bio: string | null
  image_url: string | null
  created_at: string
}

export type PlaylistResponse = {
  id: number
  name: string
  description: string | null
  cover_url: string | null
  is_public: boolean
  owner_id: number
  owner_username: string
  song_count: number
  created_at: string
}

export type SongInPlaylist = {
  id: number
  title: string
  duration: number
  cover_url: string | null
  artist_name: string
  position: number
}

export type PlaylistDetailResponse = PlaylistResponse & {
  songs: SongInPlaylist[]
}
