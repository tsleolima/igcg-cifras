from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin


class Artist(Base, TimestampMixin):
    __tablename__ = "artists"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    bio: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(String(500))

    # Relationships
    albums: Mapped[list["Album"]] = relationship(back_populates="artist", cascade="all, delete-orphan")
    songs: Mapped[list["Song"]] = relationship(back_populates="artist")

    def __repr__(self) -> str:
        return f"<Artist(id={self.id}, name={self.name})>"
