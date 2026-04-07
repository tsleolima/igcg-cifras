import { Navigate, Route, Routes } from 'react-router-dom'
import { LayoutV2 } from './ui/LayoutV2'
import { ProtectedRoute } from './ui/ProtectedRoute'

import { HomePageV2 } from './views/HomePageV2'
import { LoginPageV2 } from './views/LoginPageV2'
import { RegisterPageV2 } from './views/RegisterPageV2'
import { ProfilePageV2 } from './views/ProfilePageV2'
import { SongsPageV2 } from './views/SongsPageV2'
import { SongDetailPageV2 } from './views/SongDetailPageV2'
import { TopSongsPageV2 } from './views/TopSongsPageV2'
import { AlbumsPageV2 } from './views/AlbumsPageV2'
import { AlbumDetailPageV2 } from './views/AlbumDetailPageV2'
import { ArtistsPageV2 } from './views/ArtistsPageV2'
import { ArtistDetailPageV2 } from './views/ArtistDetailPageV2'
import { TopArtistsPageV2 } from './views/TopArtistsPageV2'
import { FavoritesPageV2 } from './views/FavoritesPageV2'
import { PlaylistsPageV2 } from './views/PlaylistsPageV2'
import { PlaylistDetailPageV2 } from './views/PlaylistDetailPageV2'
import { PlaylistCreatePageV2 } from './views/PlaylistCreatePageV2'
import { PlaylistEditPageV2 } from './views/PlaylistEditPageV2'
import { SearchPageV2 } from './views/SearchPageV2'
import { AdminPageV2 } from './views/AdminPageV2'

export default function App() {
  return (
    <Routes>
      <Route element={<LayoutV2 />}>
        <Route index element={<HomePageV2 />} />
        <Route path="/login" element={<LoginPageV2 />} />
        <Route path="/register" element={<RegisterPageV2 />} />

        <Route path="/profile" element={<ProtectedRoute element={<ProfilePageV2 />} />} />

        <Route path="/songs" element={<ProtectedRoute element={<SongsPageV2 />} />} />
        <Route path="/songs/top" element={<ProtectedRoute element={<TopSongsPageV2 />} />} />
        <Route path="/songs/:id" element={<ProtectedRoute element={<SongDetailPageV2 />} />} />

        <Route path="/albums" element={<ProtectedRoute element={<AlbumsPageV2 />} />} />
        <Route path="/albums/:id" element={<ProtectedRoute element={<AlbumDetailPageV2 />} />} />

        <Route path="/artists" element={<ProtectedRoute element={<ArtistsPageV2 />} />} />
        <Route path="/artists/top" element={<ProtectedRoute element={<TopArtistsPageV2 />} />} />
        <Route path="/artists/:id" element={<ProtectedRoute element={<ArtistDetailPageV2 />} />} />

        <Route path="/favorites" element={<ProtectedRoute element={<FavoritesPageV2 />} />} />

        <Route path="/playlists" element={<ProtectedRoute element={<PlaylistsPageV2 />} />} />
        <Route path="/playlists/new" element={<ProtectedRoute element={<PlaylistCreatePageV2 />} />} />
        <Route path="/playlists/:id" element={<ProtectedRoute element={<PlaylistDetailPageV2 />} />} />
        <Route path="/playlists/:id/edit" element={<ProtectedRoute element={<PlaylistEditPageV2 />} />} />

        <Route path="/search" element={<ProtectedRoute element={<SearchPageV2 />} />} />
        <Route path="/admin" element={<ProtectedRoute element={<AdminPageV2 />} />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
