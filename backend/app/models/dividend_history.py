import uuid
from datetime import date, datetime

from sqlalchemy import String, Date, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DividendHistory(Base):
    __tablename__ = "dividend_history"
    __table_args__ = (UniqueConstraint("ticker", "ex_date"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticker: Mapped[str] = mapped_column(String, nullable=False)
    ex_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    amount_per_share: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    dividend_type: Mapped[str | None] = mapped_column(String, nullable=True)
