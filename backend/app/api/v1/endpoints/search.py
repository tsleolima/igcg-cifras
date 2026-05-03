from sqlalchemy import select, or_, func
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.artist import Artist
from app.models.playlist import Playlist
from app.models.song import Song
from app.models.user import User
from app.schemas.artist import ArtistResponse
from app.schemas.playlist import PlaylistResponse
from app.schemas.search import (
    PaginatedArtistSearchResponse,
    PaginatedPlaylistSearchResponse,
    PaginatedSongSearchResponse,
    SearchAllResponse,
)
from app.schemas.song import SongHymnListResponse
from app.core.security import get_current_user
from app.utils.song_search import get_song_search_index, rank_song_search_ids

router = APIRouter()


def _build_paginated_response(*, items: list, page: int, page_size: int, total: int) -> dict:
    total_pages = (total + page_size - 1) // page_size if total else 0
    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1 and total_pages > 0,
    }


def _slice_ids(ids: list[int], page: int, page_size: int) -> list[int]:
    start = (page - 1) * page_size
    end = start + page_size
    return ids[start:end]


async def _get_favorite_song_ids(db: AsyncSession, user_id: int) -> set[int]:
    from app.models.user_favorite import UserFavorite

    fav_result = await db.execute(
        select(UserFavorite.song_id).where(UserFavorite.user_id == user_id)
    )
    return {row[0] for row in fav_result.all()}


def _serialize_songs(songs: list[Song], favorite_song_ids: set[int]) -> list[SongHymnListResponse]:
    songs_response: list[SongHymnListResponse] = []
    for song in songs:
        song_dict = SongHymnListResponse.model_validate(song).model_dump()
        song_dict["artist_name"] = song.artist.name if song.artist else None
        song_dict["is_favorited"] = song.id in favorite_song_ids
        songs_response.append(SongHymnListResponse(**song_dict))
    return songs_response


async def _fetch_ranked_songs_page(
    db: AsyncSession,
    *,
    ranked_ids: list[int],
    page: int,
    page_size: int,
) -> list[Song]:
    page_ids = _slice_ids(ranked_ids, page, page_size)
    if not page_ids:
        return []

    songs_result = await db.execute(
        select(Song)
        .where(Song.id.in_(page_ids))
        .options(joinedload(Song.artist), joinedload(Song.album))
    )
    songs_by_id = {song.id: song for song in songs_result.scalars().unique().all()}
    return [songs_by_id[song_id] for song_id in page_ids if song_id in songs_by_id]


@router.get("/songs", response_model=PaginatedSongSearchResponse)
async def search_songs(
    q: str = Query(..., min_length=1, description="Search query"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    limit: int | None = Query(None, ge=1, le=100, deprecated=True),
    fuzzy: bool = Query(True, description="Use fuzzy matching (RapidFuzz)"),
    min_score: int = Query(72, ge=0, le=100, description="Minimum fuzzy score to include"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search songs by title, artist, album, genre and hymn lyrics."""
    effective_page_size = limit or page_size
    index = await get_song_search_index(db)
    ranked_ids = rank_song_search_ids(index, q, fuzzy=fuzzy, min_score=min_score)
    songs = await _fetch_ranked_songs_page(
        db,
        ranked_ids=ranked_ids,
        page=page,
        page_size=effective_page_size,
    )
    favorite_song_ids = await _get_favorite_song_ids(db, current_user.id)

    return _build_paginated_response(
        items=_serialize_songs(songs, favorite_song_ids),
        page=page,
        page_size=effective_page_size,
        total=len(ranked_ids),
    )


@router.get("/artists", response_model=PaginatedArtistSearchResponse)
async def search_artists(
    q: str = Query(..., min_length=1, description="Search query"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    limit: int | None = Query(None, ge=1, le=100, deprecated=True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search artists by name"""
    search_term = f"%{q.lower()}%"
    effective_page_size = limit or page_size

    total_result = await db.execute(
        select(func.count(Artist.id)).where(func.lower(Artist.name).like(search_term))
    )
    total = int(total_result.scalar() or 0)

    query = (
        select(Artist)
        .where(func.lower(Artist.name).like(search_term))
        .order_by(Artist.name)
        .offset((page - 1) * effective_page_size)
        .limit(effective_page_size)
    )

    result = await db.execute(query)
    artists = result.scalars().all()

    return _build_paginated_response(
        items=[ArtistResponse.model_validate(artist) for artist in artists],
        page=page,
        page_size=effective_page_size,
        total=total,
    )


@router.get("/playlists", response_model=PaginatedPlaylistSearchResponse)
async def search_playlists(
    q: str = Query(..., min_length=1, description="Search query"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    limit: int | None = Query(None, ge=1, le=100, deprecated=True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search public playlists and user's own playlists by name"""
    search_term = f"%{q.lower()}%"
    effective_page_size = limit or page_size

    total_result = await db.execute(
        select(func.count(Playlist.id)).where(
            or_(
                Playlist.is_public == True,
                Playlist.owner_id == current_user.id,
            ),
            func.lower(Playlist.name).like(search_term),
        )
    )
    total = int(total_result.scalar() or 0)

    query = (
        select(Playlist)
        .where(
            or_(
                Playlist.is_public == True,
                Playlist.owner_id == current_user.id,
            ),
            func.lower(Playlist.name).like(search_term),
        )
        .options(joinedload(Playlist.owner))
        .order_by(Playlist.created_at.desc())
        .offset((page - 1) * effective_page_size)
        .limit(effective_page_size)
    )

    result = await db.execute(query)
    playlists = result.scalars().unique().all()

    # Add song count and owner username
    from app.models.playlist_song import PlaylistSong

    playlist_responses = []
    for playlist in playlists:
        count_result = await db.execute(
            select(func.count(PlaylistSong.id)).where(
                PlaylistSong.playlist_id == playlist.id
            )
        )
        song_count = count_result.scalar() or 0

        playlist_dict = PlaylistResponse.model_validate(playlist).model_dump()
        playlist_dict["song_count"] = song_count
        playlist_dict["owner_username"] = playlist.owner.username
        playlist_responses.append(PlaylistResponse(**playlist_dict))

    return _build_paginated_response(
        items=playlist_responses,
        page=page,
        page_size=effective_page_size,
        total=total,
    )


@router.get("/all", response_model=SearchAllResponse)
async def search_all(
    q: str = Query(..., min_length=1, description="Search query"),
    songs_page: int = Query(1, ge=1),
    artists_page: int = Query(1, ge=1),
    playlists_page: int = Query(1, ge=1),
    page_size: int = Query(8, ge=1, le=50),
    limit_per_type: int | None = Query(None, ge=1, le=50, deprecated=True),
    fuzzy_songs: bool = Query(True, description="Use fuzzy matching for songs"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search across all types (songs, artists, playlists)"""
    search_term = f"%{q.lower()}%"
    effective_page_size = limit_per_type or page_size

    index = await get_song_search_index(db)
    ranked_song_ids = rank_song_search_ids(index, q, fuzzy=fuzzy_songs, min_score=72)
    songs = await _fetch_ranked_songs_page(
        db,
        ranked_ids=ranked_song_ids,
        page=songs_page,
        page_size=effective_page_size,
    )

    artists_total_result = await db.execute(
        select(func.count(Artist.id)).where(func.lower(Artist.name).like(search_term))
    )
    artists_total = int(artists_total_result.scalar() or 0)

    artists_query = (
        select(Artist)
        .where(func.lower(Artist.name).like(search_term))
        .order_by(Artist.name)
        .offset((artists_page - 1) * effective_page_size)
        .limit(effective_page_size)
    )

    artists_result = await db.execute(artists_query)
    artists = artists_result.scalars().all()

    playlists_total_result = await db.execute(
        select(func.count(Playlist.id)).where(
            or_(
                Playlist.is_public == True,
                Playlist.owner_id == current_user.id,
            ),
            func.lower(Playlist.name).like(search_term),
        )
    )
    playlists_total = int(playlists_total_result.scalar() or 0)

    playlists_query = (
        select(Playlist)
        .where(
            or_(
                Playlist.is_public == True,
                Playlist.owner_id == current_user.id,
            ),
            func.lower(Playlist.name).like(search_term),
        )
        .options(joinedload(Playlist.owner))
        .order_by(Playlist.created_at.desc())
        .offset((playlists_page - 1) * effective_page_size)
        .limit(effective_page_size)
    )

    playlists_result = await db.execute(playlists_query)
    playlists = playlists_result.scalars().unique().all()

    from app.models.playlist_song import PlaylistSong

    favorite_song_ids = await _get_favorite_song_ids(db, current_user.id)

    playlist_responses = []
    for playlist in playlists:
        count_result = await db.execute(
            select(func.count(PlaylistSong.id)).where(
                PlaylistSong.playlist_id == playlist.id
            )
        )
        song_count = count_result.scalar() or 0

        playlist_dict = PlaylistResponse.model_validate(playlist).model_dump()
        playlist_dict["song_count"] = song_count
        playlist_dict["owner_username"] = playlist.owner.username
        playlist_responses.append(playlist_dict)

    return {
        "songs": _build_paginated_response(
            items=_serialize_songs(songs, favorite_song_ids),
            page=songs_page,
            page_size=effective_page_size,
            total=len(ranked_song_ids),
        ),
        "artists": _build_paginated_response(
            items=[ArtistResponse.model_validate(a) for a in artists],
            page=artists_page,
            page_size=effective_page_size,
            total=artists_total,
        ),
        "playlists": _build_paginated_response(
            items=playlist_responses,
            page=playlists_page,
            page_size=effective_page_size,
            total=playlists_total,
        ),
    }
