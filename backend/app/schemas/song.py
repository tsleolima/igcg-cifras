from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class SongBase(BaseModel):
    title: str = Field(..., max_length=255)
    duration: int = Field(..., gt=0)  # in seconds
    audio_url: str
    cover_url: str | None = None
    lyrics: str | None = None
    genre: str | None = Field(None, max_length=100)
    artist_id: int
    album_id: int | None = None


class SongCreate(BaseModel):
    """Create song - artist_id is set automatically to church"""
    title: str = Field(..., max_length=255)
    duration: int = Field(..., gt=0)  # in seconds
    audio_url: str
    cover_url: str | None = None
    lyrics: str | None = None
    lyrics_with_chords: str | None = None
    language: str | None = Field(None, max_length=10, description="Language code: pt, en, es, etc")
    genre: str | None = Field(None, max_length=100)
    album_id: int | None = None


class SongUpdate(BaseModel):
    title: str | None = Field(None, max_length=255)
    duration: int | None = Field(None, gt=0)
    audio_url: str | None = None
    cover_url: str | None = None
    lyrics: str | None = None
    lyrics_with_chords: str | None = None
    language: str | None = Field(None, max_length=10)
    genre: str | None = Field(None, max_length=100)


class SongResponse(BaseModel):
    id: int
    title: str
    duration: int
    audio_url: str
    cover_url: str | None
    lyrics: str | None
    lyrics_with_chords: str | None
    language: str | None
    genre: str | None
    categories: list[dict] | None = None
    cifra_content: str | None = None
    original_key: str | None = None
    rhythm: str | None = None
    introduction: str | None = None
    pdf_view_url: str | None = None
    play_count: int
    artist_id: int
    album_id: int | None
    created_at: datetime
    is_favorited: bool = False  # Will be set dynamically based on user

    model_config = ConfigDict(from_attributes=True)


class SongListResponse(BaseModel):
    """Response for song lists with artist/album info"""
    id: int
    title: str
    duration: int
    cover_url: str | None
    play_count: int
    artist_name: str
    album_title: str | None = None
    is_favorited: bool = False

    model_config = ConfigDict(from_attributes=True)


class SongHymnListResponse(BaseModel):
    """Compact song shape for cifra/hinos use-cases."""

    id: int
    title: str
    play_count: int = 0
    categories: list[dict] | None = None
    original_key: str | None = None
    rhythm: str | None = None
    introduction: str | None = None
    pdf_view_url: str | None = None
    artist_id: int
    artist_name: str | None = None
    is_favorited: bool = False

    model_config = ConfigDict(from_attributes=True)


class SongHymnDetailResponse(SongHymnListResponse):
    cifra_content: str | None = None
    lyrics_with_chords: str | None = None
