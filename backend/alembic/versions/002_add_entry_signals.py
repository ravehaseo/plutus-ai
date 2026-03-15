"""Add entry_signal and entry_reasoning to market_cache

Revision ID: 002
Revises: 001
Create Date: 2026-03-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("market_cache", sa.Column("entry_signal", sa.String(), nullable=True))
    op.add_column("market_cache", sa.Column("entry_reasoning", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("market_cache", "entry_reasoning")
    op.drop_column("market_cache", "entry_signal")
