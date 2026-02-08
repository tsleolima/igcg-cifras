from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, songs, artists, albums, playlists, favorites, search

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(songs.router, prefix="/songs", tags=["Songs"])
api_router.include_router(artists.router, prefix="/artists", tags=["Artists"])
api_router.include_router(albums.router, prefix="/albums", tags=["Albums"])
api_router.include_router(playlists.router, prefix="/playlists", tags=["Playlists"])
api_router.include_router(favorites.router, prefix="/favorites", tags=["Favorites"])
api_router.include_router(search.router, prefix="/search", tags=["Search"])
