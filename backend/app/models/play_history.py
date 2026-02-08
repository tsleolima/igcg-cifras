from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin


class PlayHistory(Base, TimestampMixin):
    """Track when users play songs"""
    __tablename__ = "play_history"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    song_id: Mapped[int] = mapped_column(ForeignKey("songs.id", ondelete="CASCADE"), nullable=False, index=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="play_history")
    song: Mapped["Song"] = relationship(back_populates="play_history")

    def __repr__(self) -> str:
        return f"<PlayHistory(user_id={self.user_id}, song_id={self.song_id})>"
