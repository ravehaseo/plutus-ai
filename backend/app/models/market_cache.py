from datetime import datetime

from sqlalchemy import String, Boolean, Numeric, DateTime, BigInteger
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class MarketCache(Base):
    __tablename__ = "market_cache"

    ticker: Mapped[str] = mapped_column(String, primary_key=True)
    stock_name: Mapped[str | None] = mapped_column(String, nullable=True)
    last_close: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    week_52_high: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    week_52_low: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    dividend_yield: Mapped[float | None] = mapped_column(Numeric(6, 4), nullable=True)
    annual_dividend: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    pe_ratio: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    market_cap: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    cost_per_lot: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    dividend_per_lot: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    war_fear_discount: Mapped[float | None] = mapped_column(Numeric(6, 4), nullable=True)
    is_sale_opportunity: Mapped[bool] = mapped_column(Boolean, default=False)
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
