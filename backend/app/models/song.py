from sqlalchemy import String, ForeignKey, Integer, Text, BigInteger, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin


class Song(Base, TimestampMixin):
    __tablename__ = "songs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    duration: Mapped[int] = mapped_column(Integer, nullable=False)  # Duration in seconds
    audio_url: Mapped[str] = mapped_column(String(500), nullable=False)
    cover_url: Mapped[str | None] = mapped_column(String(500))

    # Lyrics fields
    lyrics: Mapped[str | None] = mapped_column(Text)  # Letra simples
    lyrics_with_chords: Mapped[str | None] = mapped_column(Text)  # Letra com cifras
    language: Mapped[str | None] = mapped_column(String(10), index=True)  # pt, en, es, etc
    link: Mapped[str | None] = mapped_column(String(500))  # Link to source page
    source_url: Mapped[str | None] = mapped_column(String(500))  # Direct download/play URL (if different from audio_url)

    # Hymn/cifra metadata fields
    categories: Mapped[list[dict] | None] = mapped_column(JSON)  # [{name, taxonomy}, ...]
    cifra_content: Mapped[str | None] = mapped_column(Text)  # tcm_params.cifraContent (often HTML)
    original_key: Mapped[str | None] = mapped_column(String(20))  # tcm_params.originalKey
    rhythm: Mapped[str | None] = mapped_column(String(100))  # ui_fields.rhythm
    introduction: Mapped[str | None] = mapped_column(Text)  # ui_fields.introduction
    pdf_view_url: Mapped[str | None] = mapped_column(String(500))  # sheet_links.pdf_view_url

    genre: Mapped[str | None] = mapped_column(String(100))
    play_count: Mapped[int] = mapped_column(BigInteger, default=0)

    # Foreign keys
    artist_id: Mapped[int] = mapped_column(ForeignKey("artists.id", ondelete="CASCADE"), nullable=False)
    album_id: Mapped[int | None] = mapped_column(ForeignKey("albums.id", ondelete="SET NULL"))

    # Relationships
    artist: Mapped["Artist"] = relationship(back_populates="songs")
    album: Mapped["Album | None"] = relationship(back_populates="songs")
    playlist_associations: Mapped[list["PlaylistSong"]] = relationship(back_populates="song", cascade="all, delete-orphan")
    favorites: Mapped[list["UserFavorite"]] = relationship(back_populates="song", cascade="all, delete-orphan")
    play_history: Mapped[list["PlayHistory"]] = relationship(back_populates="song", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Song(id={self.id}, title={self.title})>"
