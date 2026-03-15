import uuid
from datetime import datetime

from sqlalchemy import Boolean, Numeric, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AllocationHistory(Base):
    __tablename__ = "allocation_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    total_amount: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    plan: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    projected_annual_dividend_before: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    projected_annual_dividend_after: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    executed: Mapped[bool] = mapped_column(Boolean, default=False)
    executed_items: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    profile = relationship("Profile", back_populates="allocation_history")
