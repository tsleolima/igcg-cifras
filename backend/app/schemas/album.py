from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class AlbumBase(BaseModel):
    title: str = Field(..., max_length=255)
    cover_url: str | None = None
    release_year: int | None = Field(None, ge=1900, le=2100)
    artist_id: int


class AlbumCreate(BaseModel):
    """Create album - artist_id is set automatically to church"""
    title: str = Field(..., max_length=255)
    cover_url: str | None = None
    release_year: int | None = Field(None, ge=1900, le=2100)


class AlbumUpdate(BaseModel):
    title: str | None = Field(None, max_length=255)
    cover_url: str | None = None
    release_year: int | None = Field(None, ge=1900, le=2100)


class AlbumResponse(BaseModel):
    id: int
    title: str
    cover_url: str | None
    release_year: int | None
    artist_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
