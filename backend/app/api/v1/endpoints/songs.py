from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import joinedload

from app.db.session import get_db
from app.db.redis import cache_get, cache_set, cache_delete_pattern
from app.models.user import User
from app.models.song import Song
from app.models.artist import Artist
from app.models.album import Album
from app.models.user_favorite import UserFavorite
from app.schemas.song import SongCreate, SongUpdate, SongHymnListResponse, SongHymnDetailResponse
from app.core.security import get_current_user, get_current_active_superuser
from app.core.constants import CHURCH_ARTIST_ID

router = APIRouter()


@router.get("/", response_model=list[SongHymnListResponse])
async def get_songs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    language: str | None = Query(None, description="Filter by language: pt, en, es"),
    genre: str | None = Query(None, description="Filter by genre"),
    album_id: int | None = Query(None, description="Filter by album"),
    artist_id: int | None = Query(None, description="Filter by artist"),
    favorites_only: bool = Query(False, description="Show only user's favorites"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all songs with filtering: language, genre, album, artist, favorites"""
    # Build query
    query = select(Song).options(joinedload(Song.artist), joinedload(Song.album))

    # Apply filters
    if language:
        query = query.where(Song.language == language)
    if genre:
        query = query.where(Song.genre == genre)
    if album_id:
        query = query.where(Song.album_id == album_id)
    if artist_id:
        query = query.where(Song.artist_id == artist_id)

    # Filter by favorites
    if favorites_only:
        query = query.join(UserFavorite, Song.id == UserFavorite.song_id).where(
            UserFavorite.user_id == current_user.id
        )

    query = query.offset(skip).limit(limit).order_by(Song.created_at.desc())

    result = await db.execute(query)
    songs = result.scalars().unique().all()

    # Get user favorites to mark songs
    fav_result = await db.execute(
        select(UserFavorite.song_id).where(UserFavorite.user_id == current_user.id)
    )
    favorite_song_ids = {row[0] for row in fav_result.all()}

    # Add is_favorited field
    songs_response = []
    for song in songs:
        song_dict = SongHymnListResponse.model_validate(song).model_dump()
        song_dict["artist_name"] = song.artist.name if song.artist else None
        song_dict["is_favorited"] = song.id in favorite_song_ids
        songs_response.append(SongHymnListResponse(**song_dict))

    return songs_response


@router.get("/top", response_model=list[SongHymnListResponse])
async def get_top_songs(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get top songs by play count (cached for performance).

    Fallback behavior:
    - Return songs with play_count > 0 ordered by play_count desc.
    - If there are not enough, fill the rest with most recently created songs.
    """
    cache_key = f"top_songs:{limit}"
    cached = await cache_get(cache_key)

    if cached:
        return cached

    songs: list[Song] = []

    played_query = (
        select(Song)
        .options(joinedload(Song.artist), joinedload(Song.album))
        .where(Song.play_count > 0)
        .order_by(Song.play_count.desc(), Song.created_at.desc())
        .limit(limit)
    )

    result = await db.execute(played_query)
    songs = result.scalars().unique().all()

    if len(songs) < limit:
        remaining = limit - len(songs)
        exclude_ids = [s.id for s in songs]

        fallback_query = (
            select(Song)
            .options(joinedload(Song.artist), joinedload(Song.album))
            .order_by(Song.created_at.desc(), Song.id.desc())
            .limit(remaining)
        )

        if exclude_ids:
            fallback_query = fallback_query.where(Song.id.notin_(exclude_ids))

        fallback_result = await db.execute(fallback_query)
        fallback_songs = fallback_result.scalars().unique().all()
        songs.extend(fallback_songs)

    # Get user favorites
    fav_result = await db.execute(
        select(UserFavorite.song_id).where(UserFavorite.user_id == current_user.id)
    )
    favorite_song_ids = {row[0] for row in fav_result.all()}

    songs_response = []
    for song in songs:
        song_dict = SongHymnListResponse.model_validate(song).model_dump()
        song_dict["artist_name"] = song.artist.name if song.artist else None
        song_dict["is_favorited"] = song.id in favorite_song_ids
        songs_response.append(SongHymnListResponse(**song_dict))

    # Cache for 5 minutes
    await cache_set(cache_key, [s.model_dump() for s in songs_response])

    return songs_response


@router.get("/{song_id}", response_model=SongHymnDetailResponse)
async def get_song(
    song_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get song by ID"""
    result = await db.execute(
        select(Song)
        .where(Song.id == song_id)
        .options(joinedload(Song.artist), joinedload(Song.album))
    )
    song = result.scalar_one_or_none()

    if not song:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Song not found",
        )

    # Check if favorited
    fav_result = await db.execute(
        select(UserFavorite).where(
            UserFavorite.user_id == current_user.id,
            UserFavorite.song_id == song_id,
        )
    )
    is_favorited = fav_result.scalar_one_or_none() is not None

    song_dict = SongHymnDetailResponse.model_validate(song).model_dump()
    song_dict["artist_name"] = song.artist.name if song.artist else None
    song_dict["is_favorited"] = is_favorited

    return SongHymnDetailResponse(**song_dict)


@router.post("/", response_model=SongHymnDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_song(
    song_data: SongCreate,
    current_user: User = Depends(get_current_active_superuser),
    db: AsyncSession = Depends(get_db),
):
    """Create a new song (admin only)"""
    # Force artist_id to be the church
    song_dict = song_data.model_dump()
    song_dict["artist_id"] = CHURCH_ARTIST_ID

    # Verify album exists if provided
    if song_data.album_id:
        result = await db.execute(select(Album).where(Album.id == song_data.album_id))
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Album not found",
            )

    song = Song(**song_dict)
    db.add(song)
    await db.commit()

    # Reload with relationships eagerly loaded to avoid async lazy-load (MissingGreenlet)
    result = await db.execute(
        select(Song)
        .where(Song.id == song.id)
        .options(joinedload(Song.artist), joinedload(Song.album))
    )
    song = result.scalar_one()

    # Invalidate cache
    await cache_delete_pattern("top_songs:*")

    response_dict = SongHymnDetailResponse.model_validate(song).model_dump()
    response_dict["artist_name"] = song.artist.name if song.artist else None
    response_dict["is_favorited"] = False
    return SongHymnDetailResponse(**response_dict)


@router.put("/{song_id}", response_model=SongHymnDetailResponse)
async def update_song(
    song_id: int,
    song_update: SongUpdate,
    current_user: User = Depends(get_current_active_superuser),
    db: AsyncSession = Depends(get_db),
):
    """Update a song (admin only, no delete)"""
    result = await db.execute(select(Song).where(Song.id == song_id))
    song = result.scalar_one_or_none()

    if not song:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Song not found",
        )

    update_data = song_update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(song, field, value)

    await db.commit()

    # Reload with relationships eagerly loaded to avoid async lazy-load (MissingGreenlet)
    result = await db.execute(
        select(Song)
        .where(Song.id == song_id)
        .options(joinedload(Song.artist), joinedload(Song.album))
    )
    song = result.scalar_one()

    # Invalidate cache
    await cache_delete_pattern("top_songs:*")

    response_dict = SongHymnDetailResponse.model_validate(song).model_dump()
    response_dict["artist_name"] = song.artist.name if song.artist else None
    response_dict["is_favorited"] = False
    return SongHymnDetailResponse(**response_dict)


@router.post("/{song_id}/play")
async def increment_play_count(
    song_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Increment play count for a song"""
    result = await db.execute(select(Song).where(Song.id == song_id))
    song = result.scalar_one_or_none()

    if not song:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Song not found",
        )

    # Increment play count
    song.play_count += 1

    # Add to play history
    from app.models.play_history import PlayHistory

    play_record = PlayHistory(user_id=current_user.id, song_id=song_id)
    db.add(play_record)

    await db.commit()

    # Invalidate cache
    await cache_delete_pattern("top_songs:*")

    return {"message": "Play count incremented", "play_count": song.play_count}


@router.get("/{song_id}/lyrics")
async def get_song_lyrics(
    song_id: int,
    include_chords: bool = Query(False, description="Include chords in response"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get song lyrics (with or without chords)"""
    result = await db.execute(
        select(Song)
        .where(Song.id == song_id)
        .options(joinedload(Song.artist), joinedload(Song.album))
    )
    song = result.scalar_one_or_none()

    if not song:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Song not found",
        )

    response = {
        "song_id": song.id,
        "title": song.title,
        "artist": song.artist.name if song.artist else None,
        "album": song.album.title if song.album else None,
        "language": song.language,
        "lyrics": song.lyrics_with_chords if include_chords else song.lyrics,
        "has_chords": song.lyrics_with_chords is not None,
    }

    return response
