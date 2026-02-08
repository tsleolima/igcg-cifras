from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin


class UserFavorite(Base, TimestampMixin):
    """User's favorite songs"""
    __tablename__ = "user_favorites"
    __table_args__ = (
        UniqueConstraint('user_id', 'song_id', name='unique_user_song_favorite'),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    song_id: Mapped[int] = mapped_column(ForeignKey("songs.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="favorites")
    song: Mapped["Song"] = relationship(back_populates="favorites")

    def __repr__(self) -> str:
        return f"<UserFavorite(user_id={self.user_id}, song_id={self.song_id})>"
