import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './ui/Layout'
import { ProtectedRoute } from './ui/ProtectedRoute'

import { HomePage } from './views/HomePage'
import { LoginPage } from './views/LoginPage'
import { RegisterPage } from './views/RegisterPage'
import { ProfilePage } from './views/ProfilePage'
import { SongsPage } from './views/SongsPage'
import { SongDetailPage } from './views/SongDetailPage'
import { TopSongsPage } from './views/TopSongsPage'
import { AlbumsPage } from './views/AlbumsPage'
import { AlbumDetailPage } from './views/AlbumDetailPage'
import { ArtistsPage } from './views/ArtistsPage'
import { ArtistDetailPage } from './views/ArtistDetailPage'
import { TopArtistsPage } from './views/TopArtistsPage'
import { FavoritesPage } from './views/FavoritesPage'
import { PlaylistsPage } from './views/PlaylistsPage'
import { PlaylistDetailPage } from './views/PlaylistDetailPage'
import { PlaylistCreatePage } from './views/PlaylistCreatePage'
import { PlaylistEditPage } from './views/PlaylistEditPage'
import { SearchPage } from './views/SearchPage'
import { AdminPage } from './views/AdminPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ProtectedRoute element={<HomePage />} />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/profile" element={<ProtectedRoute element={<ProfilePage />} />} />

        <Route path="/songs" element={<ProtectedRoute element={<SongsPage />} />} />
        <Route path="/songs/top" element={<ProtectedRoute element={<TopSongsPage />} />} />
        <Route path="/songs/:id" element={<ProtectedRoute element={<SongDetailPage />} />} />

        <Route path="/albums" element={<ProtectedRoute element={<AlbumsPage />} />} />
        <Route path="/albums/:id" element={<ProtectedRoute element={<AlbumDetailPage />} />} />

        <Route path="/artists" element={<ProtectedRoute element={<ArtistsPage />} />} />
        <Route path="/artists/top" element={<ProtectedRoute element={<TopArtistsPage />} />} />
        <Route path="/artists/:id" element={<ProtectedRoute element={<ArtistDetailPage />} />} />

        <Route path="/favorites" element={<ProtectedRoute element={<FavoritesPage />} />} />

        <Route path="/playlists" element={<ProtectedRoute element={<PlaylistsPage />} />} />
        <Route path="/playlists/new" element={<ProtectedRoute element={<PlaylistCreatePage />} />} />
        <Route path="/playlists/:id" element={<ProtectedRoute element={<PlaylistDetailPage />} />} />
        <Route path="/playlists/:id/edit" element={<ProtectedRoute element={<PlaylistEditPage />} />} />

        <Route path="/search" element={<ProtectedRoute element={<SearchPage />} />} />
        <Route path="/admin" element={<ProtectedRoute element={<AdminPage />} />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
