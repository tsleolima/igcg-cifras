from pydantic import BaseModel

from app.schemas.artist import ArtistResponse
from app.schemas.playlist import PlaylistResponse
from app.schemas.song import SongHymnListResponse


class SearchPageMeta(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool


class PaginatedSongSearchResponse(SearchPageMeta):
    items: list[SongHymnListResponse]


class PaginatedArtistSearchResponse(SearchPageMeta):
    items: list[ArtistResponse]


class PaginatedPlaylistSearchResponse(SearchPageMeta):
    items: list[PlaylistResponse]


class SearchAllResponse(BaseModel):
    songs: PaginatedSongSearchResponse
    artists: PaginatedArtistSearchResponse
    playlists: PaginatedPlaylistSearchResponse