from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.db.session import get_db
from app.models.user import User
from app.models.album import Album
from app.models.song import Song
from app.schemas.album import AlbumCreate, AlbumUpdate, AlbumResponse
from app.schemas.song import SongHymnListResponse
from app.core.security import get_current_user, get_current_active_superuser
from app.core.constants import CHURCH_ARTIST_ID

router = APIRouter()


@router.get("/", response_model=list[AlbumResponse])
async def get_albums(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all albums from the church"""
    query = (
        select(Album)
        .where(Album.artist_id == CHURCH_ARTIST_ID)
        .options(joinedload(Album.artist))
        .offset(skip)
        .limit(limit)
        .order_by(Album.release_year.desc(), Album.title)
    )

    result = await db.execute(query)
    albums = result.scalars().unique().all()

    return [AlbumResponse.model_validate(album) for album in albums]


@router.get("/{album_id}", response_model=AlbumResponse)
async def get_album(
    album_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get album by ID with songs"""
    result = await db.execute(
        select(Album)
        .where(Album.id == album_id)
        .options(joinedload(Album.artist))
    )
    album = result.scalar_one_or_none()

    if not album:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found",
        )

    return album


@router.post("/", response_model=AlbumResponse, status_code=status.HTTP_201_CREATED)
async def create_album(
    album_data: AlbumCreate,
    current_user: User = Depends(get_current_active_superuser),
    db: AsyncSession = Depends(get_db),
):
    """Create a new album (admin only)"""
    # Force artist_id to be the church
    album_dict = album_data.model_dump()
    album_dict["artist_id"] = CHURCH_ARTIST_ID

    album = Album(**album_dict)
    db.add(album)
    await db.commit()
    await db.refresh(album)

    return album


@router.put("/{album_id}", response_model=AlbumResponse)
async def update_album(
    album_id: int,
    album_update: AlbumUpdate,
    current_user: User = Depends(get_current_active_superuser),
    db: AsyncSession = Depends(get_db),
):
    """Update an album (admin only)"""
    result = await db.execute(select(Album).where(Album.id == album_id))
    album = result.scalar_one_or_none()

    if not album:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found",
        )

    update_data = album_update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(album, field, value)

    await db.commit()
    await db.refresh(album)

    return album


@router.get("/{album_id}/songs", response_model=list[SongHymnListResponse])
async def get_album_songs(
    album_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all songs from an album"""
    # Verify album exists
    result = await db.execute(select(Album).where(Album.id == album_id))
    album = result.scalar_one_or_none()

    if not album:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found",
        )

    # Get songs
    query = (
        select(Song)
        .where(Song.album_id == album_id)
        .options(joinedload(Song.artist))
        .order_by(Song.title)
    )

    result = await db.execute(query)
    songs = result.scalars().unique().all()

    return [SongHymnListResponse.model_validate(song) for song in songs]
