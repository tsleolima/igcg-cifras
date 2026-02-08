from sqlalchemy import String, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin


class Album(Base, TimestampMixin):
    __tablename__ = "albums"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    cover_url: Mapped[str | None] = mapped_column(String(500))
    release_year: Mapped[int | None] = mapped_column(Integer)
    artist_id: Mapped[int] = mapped_column(ForeignKey("artists.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    artist: Mapped["Artist"] = relationship(back_populates="albums")
    songs: Mapped[list["Song"]] = relationship(back_populates="album", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Album(id={self.id}, title={self.title})>"
