from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload

from app.db.session import get_db
from app.db.redis import cache_get, cache_set, cache_delete_pattern
from app.models.user import User
from app.models.artist import Artist
from app.models.song import Song
from app.schemas.artist import ArtistCreate, ArtistUpdate, ArtistResponse
from app.core.security import get_current_user, get_current_active_superuser

router = APIRouter()


@router.get("/", response_model=list[ArtistResponse])
async def get_artists(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all artists"""
    query = select(Artist).offset(skip).limit(limit).order_by(Artist.name)

    result = await db.execute(query)
    artists = result.scalars().all()

    return [ArtistResponse.model_validate(artist) for artist in artists]


@router.get("/top", response_model=list[ArtistResponse])
async def get_top_artists(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get top artists by total play count (cached)"""
    cache_key = f"top_artists:{limit}"
    cached = await cache_get(cache_key)

    if cached:
        return cached

    # Get artists with most total plays
    query = (
        select(Artist, func.sum(Song.play_count).label("total_plays"))
        .join(Song, Artist.id == Song.artist_id)
        .group_by(Artist.id)
        .order_by(func.sum(Song.play_count).desc())
        .limit(limit)
    )

    result = await db.execute(query)
    artists_with_plays = result.all()

    artists_response = [
        ArtistResponse.model_validate(artist).model_dump()
        for artist, _ in artists_with_plays
    ]

    await cache_set(cache_key, artists_response)

    return artists_response


@router.get("/{artist_id}", response_model=ArtistResponse)
async def get_artist(
    artist_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get artist by ID"""
    result = await db.execute(select(Artist).where(Artist.id == artist_id))
    artist = result.scalar_one_or_none()

    if not artist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artist not found",
        )

    return artist


@router.post("/", response_model=ArtistResponse, status_code=status.HTTP_201_CREATED)
async def create_artist(
    artist_data: ArtistCreate,
    current_user: User = Depends(get_current_active_superuser),
    db: AsyncSession = Depends(get_db),
):
    """Create a new artist (admin only)"""
    # Check if artist already exists
    result = await db.execute(select(Artist).where(Artist.name == artist_data.name))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Artist already exists",
        )

    artist = Artist(**artist_data.model_dump())
    db.add(artist)
    await db.commit()
    await db.refresh(artist)

    # Invalidate cache
    await cache_delete_pattern("top_artists:*")

    return artist


@router.put("/{artist_id}", response_model=ArtistResponse)
async def update_artist(
    artist_id: int,
    artist_update: ArtistUpdate,
    current_user: User = Depends(get_current_active_superuser),
    db: AsyncSession = Depends(get_db),
):
    """Update an artist (admin only)"""
    result = await db.execute(select(Artist).where(Artist.id == artist_id))
    artist = result.scalar_one_or_none()

    if not artist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artist not found",
        )

    update_data = artist_update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(artist, field, value)

    await db.commit()
    await db.refresh(artist)

    # Invalidate cache
    await cache_delete_pattern("top_artists:*")

    return artist
