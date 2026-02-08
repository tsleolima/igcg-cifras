from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, and_, or_, update
from sqlalchemy.orm import joinedload, selectinload

from app.db.session import get_db
from app.models.user import User
from app.models.playlist import Playlist
from app.models.playlist_song import PlaylistSong
from app.models.song import Song
from app.models.artist import Artist
from app.schemas.playlist import (
    PlaylistCreate,
    PlaylistUpdate,
    PlaylistResponse,
    PlaylistDetailResponse,
    AddSongToPlaylist,
    ReorderPlaylistSongs,
    SongInPlaylist,
)
from app.core.security import get_current_user

router = APIRouter()


@router.get("/", response_model=list[PlaylistResponse])
async def get_playlists(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    public_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get playlists (public or user's own)"""
    query = select(Playlist).options(joinedload(Playlist.owner))

    if public_only:
        query = query.where(Playlist.is_public == True)
    else:
        # Show public playlists + user's own playlists
        query = query.where(
            or_(Playlist.is_public == True, Playlist.owner_id == current_user.id)
        )

    query = query.offset(skip).limit(limit).order_by(Playlist.created_at.desc())

    result = await db.execute(query)
    playlists = result.scalars().unique().all()

    # Add song count and owner username
    playlist_responses = []
    for playlist in playlists:
        count_result = await db.execute(
            select(func.count(PlaylistSong.id)).where(PlaylistSong.playlist_id == playlist.id)
        )
        song_count = count_result.scalar() or 0

        playlist_dict = PlaylistResponse.model_validate(playlist).model_dump()
        playlist_dict["song_count"] = song_count
        playlist_dict["owner_username"] = playlist.owner.username
        playlist_responses.append(PlaylistResponse(**playlist_dict))

    return playlist_responses


@router.get("/my", response_model=list[PlaylistResponse])
async def get_my_playlists(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's playlists"""
    query = (
        select(Playlist)
        .where(Playlist.owner_id == current_user.id)
        .options(joinedload(Playlist.owner))
        .offset(skip)
        .limit(limit)
        .order_by(Playlist.created_at.desc())
    )

    result = await db.execute(query)
    playlists = result.scalars().unique().all()

    playlist_responses = []
    for playlist in playlists:
        count_result = await db.execute(
            select(func.count(PlaylistSong.id)).where(PlaylistSong.playlist_id == playlist.id)
        )
        song_count = count_result.scalar() or 0

        playlist_dict = PlaylistResponse.model_validate(playlist).model_dump()
        playlist_dict["song_count"] = song_count
        playlist_dict["owner_username"] = playlist.owner.username
        playlist_responses.append(PlaylistResponse(**playlist_dict))

    return playlist_responses


@router.get("/{playlist_id}", response_model=PlaylistDetailResponse)
async def get_playlist(
    playlist_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get playlist details with songs"""
    result = await db.execute(
        select(Playlist)
        .where(Playlist.id == playlist_id)
        .options(joinedload(Playlist.owner))
    )
    playlist = result.scalar_one_or_none()

    if not playlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playlist not found",
        )

    # Check permissions (must be public or owned by user)
    if not playlist.is_public and playlist.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this playlist",
        )

    # Get songs in playlist
    songs_query = (
        select(Song, PlaylistSong.position, Artist.name)
        .join(PlaylistSong, Song.id == PlaylistSong.song_id)
        .join(Artist, Song.artist_id == Artist.id)
        .where(PlaylistSong.playlist_id == playlist_id)
        .order_by(PlaylistSong.position)
    )

    songs_result = await db.execute(songs_query)
    songs_data = songs_result.all()

    songs_in_playlist = [
        SongInPlaylist(
            id=song.id,
            title=song.title,
            duration=song.duration,
            cover_url=song.cover_url,
            artist_name=artist_name,
            position=position,
        )
        for song, position, artist_name in songs_data
    ]

    count_result = await db.execute(
        select(func.count(PlaylistSong.id)).where(PlaylistSong.playlist_id == playlist.id)
    )
    song_count = count_result.scalar() or 0

    playlist_dict = PlaylistDetailResponse.model_validate(playlist).model_dump()
    playlist_dict["song_count"] = song_count
    playlist_dict["owner_username"] = playlist.owner.username
    playlist_dict["songs"] = songs_in_playlist

    return PlaylistDetailResponse(**playlist_dict)


@router.post("/", response_model=PlaylistResponse, status_code=status.HTTP_201_CREATED)
async def create_playlist(
    playlist_data: PlaylistCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new playlist"""
    playlist = Playlist(**playlist_data.model_dump(), owner_id=current_user.id)

    db.add(playlist)
    await db.commit()
    await db.refresh(playlist)

    playlist_dict = PlaylistResponse.model_validate(playlist).model_dump()
    playlist_dict["song_count"] = 0
    playlist_dict["owner_username"] = current_user.username

    return PlaylistResponse(**playlist_dict)


@router.put("/{playlist_id}", response_model=PlaylistResponse)
async def update_playlist(
    playlist_id: int,
    playlist_update: PlaylistUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a playlist (owner only)"""
    result = await db.execute(
        select(Playlist)
        .where(Playlist.id == playlist_id)
        .options(joinedload(Playlist.owner))
    )
    playlist = result.scalar_one_or_none()

    if not playlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playlist not found",
        )

    if playlist.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this playlist",
        )

    update_data = playlist_update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(playlist, field, value)

    await db.commit()
    await db.refresh(playlist)

    count_result = await db.execute(
        select(func.count(PlaylistSong.id)).where(PlaylistSong.playlist_id == playlist.id)
    )
    song_count = count_result.scalar() or 0

    playlist_dict = PlaylistResponse.model_validate(playlist).model_dump()
    playlist_dict["song_count"] = song_count
    playlist_dict["owner_username"] = playlist.owner.username

    return PlaylistResponse(**playlist_dict)


@router.delete("/{playlist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_playlist(
    playlist_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a playlist (owner only)"""
    result = await db.execute(select(Playlist).where(Playlist.id == playlist_id))
    playlist = result.scalar_one_or_none()

    if not playlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playlist not found",
        )

    if playlist.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this playlist",
        )

    await db.delete(playlist)
    await db.commit()


@router.post("/{playlist_id}/songs", status_code=status.HTTP_201_CREATED)
async def add_song_to_playlist(
    playlist_id: int,
    song_data: AddSongToPlaylist,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a song to playlist"""
    # Verify playlist exists and user owns it
    result = await db.execute(select(Playlist).where(Playlist.id == playlist_id))
    playlist = result.scalar_one_or_none()

    if not playlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playlist not found",
        )

    if playlist.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this playlist",
        )

    # Verify song exists
    result = await db.execute(select(Song).where(Song.id == song_data.song_id))
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Song not found",
        )

    # Check if song already in playlist
    result = await db.execute(
        select(PlaylistSong).where(
            and_(
                PlaylistSong.playlist_id == playlist_id,
                PlaylistSong.song_id == song_data.song_id,
            )
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Song already in playlist",
        )

    # Always append to the end (position = max + 1)
    max_pos_result = await db.execute(
        select(func.coalesce(func.max(PlaylistSong.position), -1)).where(
            PlaylistSong.playlist_id == playlist_id
        )
    )
    max_position = int(max_pos_result.scalar_one())
    position = max_position + 1

    playlist_song = PlaylistSong(
        playlist_id=playlist_id, song_id=song_data.song_id, position=position
    )

    db.add(playlist_song)
    await db.commit()

    return {"message": "Song added to playlist", "position": position}


@router.delete("/{playlist_id}/songs/{song_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_song_from_playlist(
    playlist_id: int,
    song_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a song from playlist"""
    # Verify playlist exists and user owns it
    result = await db.execute(select(Playlist).where(Playlist.id == playlist_id))
    playlist = result.scalar_one_or_none()

    if not playlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playlist not found",
        )

    if playlist.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this playlist",
        )

    # Delete the association
    result = await db.execute(
        delete(PlaylistSong).where(
            and_(
                PlaylistSong.playlist_id == playlist_id,
                PlaylistSong.song_id == song_id,
            )
        )
    )

    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Song not in playlist",
        )

    await db.commit()


@router.put("/{playlist_id}/songs/reorder", status_code=status.HTTP_200_OK)
async def reorder_playlist_songs(
    playlist_id: int,
    payload: ReorderPlaylistSongs,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reorder songs in a playlist (owner only).

    The request must include the full list of song IDs currently in the playlist,
    in the desired order. Positions are rewritten as 0..N-1.
    """

    # Verify playlist exists and user owns it
    result = await db.execute(select(Playlist).where(Playlist.id == playlist_id))
    playlist = result.scalar_one_or_none()

    if not playlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playlist not found",
        )

    if playlist.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this playlist",
        )

    song_ids = [int(sid) for sid in payload.song_ids]
    if len(song_ids) != len(set(song_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate song_ids are not allowed",
        )

    # Fetch current songs in playlist
    current_result = await db.execute(
        select(PlaylistSong.song_id)
        .where(PlaylistSong.playlist_id == playlist_id)
        .order_by(PlaylistSong.position)
    )
    current_song_ids = [int(row[0]) for row in current_result.all()]

    if not current_song_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Playlist has no songs",
        )

    if set(song_ids) != set(current_song_ids) or len(song_ids) != len(current_song_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="song_ids must match exactly the songs currently in the playlist",
        )

    # Rewrite positions safely.
    # SQLite enforces UNIQUE(playlist_id, position). If we update rows one-by-one
    # directly into the target range, we can temporarily collide.
    bump = 1_000_000

    # Phase 1: move all existing positions out of the way (keeps them unique).
    await db.execute(
        update(PlaylistSong)
        .where(PlaylistSong.playlist_id == playlist_id)
        .values(position=PlaylistSong.position + bump)
    )

    # Phase 2: set the final positions.
    for position, sid in enumerate(song_ids):
        await db.execute(
            update(PlaylistSong)
            .where(
                and_(
                    PlaylistSong.playlist_id == playlist_id,
                    PlaylistSong.song_id == sid,
                )
            )
            .values(position=position)
        )

    await db.commit()
    return {"message": "Playlist reordered", "song_count": len(song_ids)}
