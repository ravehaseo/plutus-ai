"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-03-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSON

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "profiles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("currency", sa.String(10), nullable=False),
        sa.Column("currency_symbol", sa.String(10), nullable=False),
        sa.Column("ticker_suffix", sa.String(10), nullable=False),
        sa.Column("lot_size", sa.Integer, nullable=False),
        sa.Column("yield_band_min", sa.Numeric(4, 2), server_default="5.00"),
        sa.Column("yield_band_max", sa.Numeric(4, 2), server_default="8.00"),
        sa.Column("war_fear_threshold", sa.Numeric(4, 2), server_default="10.00"),
        sa.Column("sector_targets", JSON, nullable=False),
        sa.Column("news_grounding_query", sa.String, nullable=True),
        sa.Column("rss_feeds", JSON, nullable=True),
        sa.Column("monthly_topup_default", sa.Numeric(10, 2), server_default="500.00"),
        sa.Column("income_goal", sa.Numeric(10, 2), server_default="2000.00"),
        sa.Column("war_chest_balance", sa.Numeric(10, 2), server_default="7000.00"),
        sa.Column("war_chest_target", sa.Numeric(10, 2), server_default="7000.00"),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "holdings",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("profile_id", UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ticker", sa.String, nullable=False),
        sa.Column("stock_name", sa.String, nullable=False),
        sa.Column("sector", sa.String, nullable=False),
        sa.Column("shares", sa.Integer, nullable=False),
        sa.Column("avg_buy_price", sa.Numeric(10, 4), nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint("profile_id", "ticker"),
    )

    op.create_table(
        "watchlist",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("profile_id", UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ticker", sa.String, nullable=False),
        sa.Column("stock_name", sa.String, nullable=False),
        sa.Column("sector", sa.String, nullable=False),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("added_at", sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint("profile_id", "ticker"),
    )

    op.create_table(
        "market_cache",
        sa.Column("ticker", sa.String, primary_key=True),
        sa.Column("stock_name", sa.String, nullable=True),
        sa.Column("last_close", sa.Numeric(10, 4), nullable=True),
        sa.Column("week_52_high", sa.Numeric(10, 4), nullable=True),
        sa.Column("week_52_low", sa.Numeric(10, 4), nullable=True),
        sa.Column("dividend_yield", sa.Numeric(6, 4), nullable=True),
        sa.Column("annual_dividend", sa.Numeric(10, 4), nullable=True),
        sa.Column("pe_ratio", sa.Numeric(10, 2), nullable=True),
        sa.Column("market_cap", sa.BigInteger, nullable=True),
        sa.Column("cost_per_lot", sa.Numeric(10, 2), nullable=True),
        sa.Column("dividend_per_lot", sa.Numeric(10, 2), nullable=True),
        sa.Column("war_fear_discount", sa.Numeric(6, 4), nullable=True),
        sa.Column("is_sale_opportunity", sa.Boolean, server_default="false"),
        sa.Column("fetched_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "dividend_history",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("ticker", sa.String, nullable=False),
        sa.Column("ex_date", sa.Date, nullable=False),
        sa.Column("payment_date", sa.Date, nullable=True),
        sa.Column("amount_per_share", sa.Numeric(10, 4), nullable=True),
        sa.Column("dividend_type", sa.String, nullable=True),
        sa.UniqueConstraint("ticker", "ex_date"),
    )

    op.create_table(
        "news_cache",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("source", sa.String, nullable=False),
        sa.Column("headline", sa.String, nullable=True),
        sa.Column("summary", sa.Text, nullable=True),
        sa.Column("affected_tickers", ARRAY(sa.String), nullable=True),
        sa.Column("sentiment", sa.String, nullable=True),
        sa.Column("ai_analysis", sa.Text, nullable=True),
        sa.Column("published_at", sa.DateTime, nullable=True),
        sa.Column("fetched_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "chat_messages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("profile_id", UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String, nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "allocation_history",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("profile_id", UUID(as_uuid=True), sa.ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("total_amount", sa.Numeric(10, 2), nullable=True),
        sa.Column("plan", JSON, nullable=True),
        sa.Column("projected_annual_dividend_before", sa.Numeric(10, 2), nullable=True),
        sa.Column("projected_annual_dividend_after", sa.Numeric(10, 2), nullable=True),
        sa.Column("executed", sa.Boolean, server_default="false"),
        sa.Column("executed_items", JSON, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("allocation_history")
    op.drop_table("chat_messages")
    op.drop_table("news_cache")
    op.drop_table("dividend_history")
    op.drop_table("market_cache")
    op.drop_table("watchlist")
    op.drop_table("holdings")
    op.drop_table("profiles")
