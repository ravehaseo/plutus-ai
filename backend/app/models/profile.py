import uuid
from datetime import datetime

from sqlalchemy import String, Integer, Boolean, Numeric, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False)
    currency_symbol: Mapped[str] = mapped_column(String(10), nullable=False)
    ticker_suffix: Mapped[str] = mapped_column(String(10), nullable=False)
    lot_size: Mapped[int] = mapped_column(Integer, nullable=False)
    yield_band_min: Mapped[float] = mapped_column(Numeric(4, 2), default=5.00)
    yield_band_max: Mapped[float] = mapped_column(Numeric(4, 2), default=8.00)
    war_fear_threshold: Mapped[float] = mapped_column(Numeric(4, 2), default=10.00)
    sector_targets: Mapped[dict] = mapped_column(JSON, nullable=False)
    news_grounding_query: Mapped[str | None] = mapped_column(String, nullable=True)
    rss_feeds: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    monthly_topup_default: Mapped[float] = mapped_column(Numeric(10, 2), default=500.00)
    income_goal: Mapped[float] = mapped_column(Numeric(10, 2), default=2000.00)
    war_chest_balance: Mapped[float] = mapped_column(Numeric(10, 2), default=7000.00)
    war_chest_target: Mapped[float] = mapped_column(Numeric(10, 2), default=7000.00)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    holdings = relationship("Holding", back_populates="profile", cascade="all, delete-orphan")
    watchlist_items = relationship("WatchlistItem", back_populates="profile", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="profile", cascade="all, delete-orphan")
    allocation_history = relationship("AllocationHistory", back_populates="profile", cascade="all, delete-orphan")
