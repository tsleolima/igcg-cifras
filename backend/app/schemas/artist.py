from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class ArtistBase(BaseModel):
    name: str = Field(..., max_length=255)
    bio: str | None = None
    image_url: str | None = None


class ArtistCreate(ArtistBase):
    pass


class ArtistUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    bio: str | None = None
    image_url: str | None = None


class ArtistResponse(ArtistBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
