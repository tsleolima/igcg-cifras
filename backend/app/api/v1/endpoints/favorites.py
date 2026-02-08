from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User
from app.models.song import Song
from app.models.user_favorite import UserFavorite
from app.schemas.song import SongHymnListResponse
from app.schemas.favorite import FavoriteResponse
from app.core.security import get_current_user

router = APIRouter()


@router.get("/", response_model=list[SongHymnListResponse])
async def get_favorites(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's favorite songs"""
    query = (
        select(Song)
        .options(selectinload(Song.artist))
        .join(UserFavorite, Song.id == UserFavorite.song_id)
        .where(UserFavorite.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
        .order_by(UserFavorite.created_at.desc())
    )

    result = await db.execute(query)
    songs = result.scalars().all()

    # All songs in this list are favorited
    songs_response = []
    for song in songs:
        song_dict = SongHymnListResponse.model_validate(song).model_dump()
        song_dict["artist_name"] = song.artist.name if song.artist else None
        song_dict["is_favorited"] = True
        songs_response.append(SongHymnListResponse(**song_dict))

    return songs_response


@router.post("/{song_id}", response_model=FavoriteResponse, status_code=status.HTTP_201_CREATED)
async def add_favorite(
    song_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add song to favorites"""
    # Verify song exists
    result = await db.execute(select(Song).where(Song.id == song_id))
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Song not found",
        )

    # Check if already favorited
    result = await db.execute(
        select(UserFavorite).where(
            and_(
                UserFavorite.user_id == current_user.id,
                UserFavorite.song_id == song_id,
            )
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Song already in favorites",
        )

    favorite = UserFavorite(user_id=current_user.id, song_id=song_id)
    db.add(favorite)
    await db.commit()
    await db.refresh(favorite)

    return favorite


@router.delete("/{song_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(
    song_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove song from favorites"""
    result = await db.execute(
        select(UserFavorite).where(
            and_(
                UserFavorite.user_id == current_user.id,
                UserFavorite.song_id == song_id,
            )
        )
    )
    favorite = result.scalar_one_or_none()

    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Song not in favorites",
        )

    await db.delete(favorite)
    await db.commit()


@router.get("/check/{song_id}", response_model=dict)
async def check_favorite(
    song_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check if song is favorited"""
    result = await db.execute(
        select(UserFavorite).where(
            and_(
                UserFavorite.user_id == current_user.id,
                UserFavorite.song_id == song_id,
            )
        )
    )
    is_favorited = result.scalar_one_or_none() is not None

    return {"song_id": song_id, "is_favorited": is_favorited}
