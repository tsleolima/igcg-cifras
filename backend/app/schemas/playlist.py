from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class PlaylistBase(BaseModel):
    name: str = Field(..., max_length=255)
    description: str | None = None
    cover_url: str | None = None
    is_public: bool = False


class PlaylistCreate(PlaylistBase):
    pass


class PlaylistUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    description: str | None = None
    cover_url: str | None = None
    is_public: bool | None = None


class PlaylistResponse(BaseModel):
    id: int
    name: str
    description: str | None
    cover_url: str | None
    is_public: bool
    owner_id: int
    owner_username: str = ""  # Filled by endpoints (joined from User)
    song_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SongInPlaylist(BaseModel):
    id: int
    title: str
    duration: int
    cover_url: str | None
    artist_name: str
    position: int  # Position in playlist

    model_config = ConfigDict(from_attributes=True)


class PlaylistDetailResponse(PlaylistResponse):
    """Detailed playlist with songs"""
    songs: list[SongInPlaylist] = []


class AddSongToPlaylist(BaseModel):
    song_id: int


class ReorderPlaylistSongs(BaseModel):
    song_ids: list[int] = Field(..., min_length=1)
