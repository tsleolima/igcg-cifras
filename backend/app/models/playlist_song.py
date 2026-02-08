from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin


class PlaylistSong(Base, TimestampMixin):
    """Association table for playlists and songs with ordering"""
    __tablename__ = "playlist_songs"
    __table_args__ = (
        UniqueConstraint('playlist_id', 'position', name='unique_playlist_position'),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    playlist_id: Mapped[int] = mapped_column(ForeignKey("playlists.id", ondelete="CASCADE"), nullable=False)
    song_id: Mapped[int] = mapped_column(ForeignKey("songs.id", ondelete="CASCADE"), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)  # Order of song in playlist

    # Relationships
    playlist: Mapped["Playlist"] = relationship(back_populates="song_associations")
    song: Mapped["Song"] = relationship(back_populates="playlist_associations")

    def __repr__(self) -> str:
        return f"<PlaylistSong(playlist_id={self.playlist_id}, song_id={self.song_id}, pos={self.position})>"
