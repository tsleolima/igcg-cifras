from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import joinedload

from app.db.session import get_db
from app.models.user import User
from app.models.song import Song
from app.models.artist import Artist
from app.models.playlist import Playlist
from app.schemas.song import SongHymnListResponse
from app.schemas.artist import ArtistResponse
from app.schemas.playlist import PlaylistResponse
from app.core.security import get_current_user
from app.utils.song_search import get_song_search_index
from app.utils.text import normalize_text

router = APIRouter()


@router.get("/songs", response_model=list[SongHymnListResponse])
async def search_songs(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, ge=1, le=100),
    fuzzy: bool = Query(True, description="Use fuzzy matching (RapidFuzz)"),
    min_score: int = Query(72, ge=0, le=100, description="Minimum fuzzy score to include"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search songs by title or artist name"""
    q_norm = normalize_text(q)

    songs: list[Song] = []

    if fuzzy:
        try:
            from rapidfuzz import fuzz, process
        except Exception:
            fuzzy = False

    if fuzzy and q_norm:
        index = await get_song_search_index(db)

        # Unique choice strings avoid collisions when multiple rows share the same normalized title.
        choices: list[str] = []
        choice_to_id: dict[str, int] = {}

        for item in index:
            song_id = int(item["id"])
            for key in ("combo_norm", "artist_title_norm", "title_norm"):
                value = item.get(key) or ""
                if not value:
                    continue
                choice = f"{value}:::{song_id}"
                choices.append(choice)
                choice_to_id[choice] = song_id

        # Grab more than `limit` and then de-dupe by song id.
        extracted = process.extract(q_norm, choices, scorer=fuzz.WRatio, limit=min(800, max(50, limit * 20)))

        ranked_ids: list[int] = []
        seen: set[int] = set()
        for choice, score, _ in extracted:
            if score is None or float(score) < float(min_score):
                continue
            song_id = choice_to_id.get(choice)
            if song_id is None or song_id in seen:
                continue
            seen.add(song_id)
            ranked_ids.append(song_id)
            if len(ranked_ids) >= limit:
                break

        if ranked_ids:
            songs_result = await db.execute(
                select(Song)
                .where(Song.id.in_(ranked_ids))
                .options(joinedload(Song.artist), joinedload(Song.album))
            )
            by_id = {s.id: s for s in songs_result.scalars().unique().all()}
            songs = [by_id[sid] for sid in ranked_ids if sid in by_id]

    if not songs:
        # Fallback: basic SQL LIKE search (fast and dependency-free)
        search_term = f"%{q.lower()}%"
        query = (
            select(Song)
            .join(Artist, Song.artist_id == Artist.id)
            .where(
                or_(
                    func.lower(Song.title).like(search_term),
                    func.lower(Artist.name).like(search_term),
                    func.lower(Song.genre).like(search_term),
                )
            )
            .options(joinedload(Song.artist), joinedload(Song.album))
            .limit(limit)
            .order_by(Song.play_count.desc())
        )

        result = await db.execute(query)
        songs = result.scalars().unique().all()

    # Get user favorites
    from app.models.user_favorite import UserFavorite

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

    return songs_response


@router.get("/artists", response_model=list[ArtistResponse])
async def search_artists(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search artists by name"""
    search_term = f"%{q.lower()}%"

    query = (
        select(Artist)
        .where(func.lower(Artist.name).like(search_term))
        .limit(limit)
        .order_by(Artist.name)
    )

    result = await db.execute(query)
    artists = result.scalars().all()

    return [ArtistResponse.model_validate(artist) for artist in artists]


@router.get("/playlists", response_model=list[PlaylistResponse])
async def search_playlists(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search public playlists and user's own playlists by name"""
    search_term = f"%{q.lower()}%"

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
        .limit(limit)
        .order_by(Playlist.created_at.desc())
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

    return playlist_responses


@router.get("/all")
async def search_all(
    q: str = Query(..., min_length=1, description="Search query"),
    limit_per_type: int = Query(5, ge=1, le=20),
    fuzzy_songs: bool = Query(True, description="Use fuzzy matching for songs"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search across all types (songs, artists, playlists)"""
    search_term = f"%{q.lower()}%"

    # For songs, prefer fuzzy (RapidFuzz) and fall back to SQL LIKE.
    songs: list[Song] = []
    if fuzzy_songs:
        q_norm = normalize_text(q)
        if q_norm:
            try:
                from rapidfuzz import fuzz, process

                index = await get_song_search_index(db)
                choices: list[str] = []
                choice_to_id: dict[str, int] = {}
                for item in index:
                    song_id = int(item["id"])
                    for key in ("combo_norm", "artist_title_norm", "title_norm"):
                        value = item.get(key) or ""
                        if not value:
                            continue
                        choice = f"{value}:::{song_id}"
                        choices.append(choice)
                        choice_to_id[choice] = song_id

                extracted = process.extract(
                    q_norm,
                    choices,
                    scorer=fuzz.WRatio,
                    limit=min(400, max(50, limit_per_type * 30)),
                )

                ranked_ids: list[int] = []
                seen: set[int] = set()
                for choice, score, _ in extracted:
                    if score is None or float(score) < 72:
                        continue
                    song_id = choice_to_id.get(choice)
                    if song_id is None or song_id in seen:
                        continue
                    seen.add(song_id)
                    ranked_ids.append(song_id)
                    if len(ranked_ids) >= limit_per_type:
                        break

                if ranked_ids:
                    songs_result = await db.execute(
                        select(Song)
                        .where(Song.id.in_(ranked_ids))
                        .options(joinedload(Song.artist), joinedload(Song.album))
                    )
                    by_id = {s.id: s for s in songs_result.scalars().unique().all()}
                    songs = [by_id[sid] for sid in ranked_ids if sid in by_id]
            except Exception:
                songs = []

    if not songs:
        songs_query = (
            select(Song)
            .join(Artist, Song.artist_id == Artist.id)
            .where(
                or_(
                    func.lower(Song.title).like(search_term),
                    func.lower(Artist.name).like(search_term),
                )
            )
            .options(joinedload(Song.artist), joinedload(Song.album))
            .limit(limit_per_type)
            .order_by(Song.play_count.desc())
        )

        songs_result = await db.execute(songs_query)
        songs = songs_result.scalars().unique().all()

    # Search artists
    artists_query = (
        select(Artist)
        .where(func.lower(Artist.name).like(search_term))
        .limit(limit_per_type)
        .order_by(Artist.name)
    )

    artists_result = await db.execute(artists_query)
    artists = artists_result.scalars().all()

    # Search playlists
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
        .limit(limit_per_type)
        .order_by(Playlist.created_at.desc())
    )

    playlists_result = await db.execute(playlists_query)
    playlists = playlists_result.scalars().unique().all()

    # Format responses
    from app.models.user_favorite import UserFavorite
    from app.models.playlist_song import PlaylistSong

    fav_result = await db.execute(
        select(UserFavorite.song_id).where(UserFavorite.user_id == current_user.id)
    )
    favorite_song_ids = {row[0] for row in fav_result.all()}

    songs_response = []
    for song in songs:
        song_dict = SongHymnListResponse.model_validate(song).model_dump()
        song_dict["artist_name"] = song.artist.name if song.artist else None
        song_dict["is_favorited"] = song.id in favorite_song_ids
        songs_response.append(song_dict)

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
        "songs": songs_response,
        "artists": [ArtistResponse.model_validate(a).model_dump() for a in artists],
        "playlists": playlist_responses,
    }
