from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class WatchlistItemOut(BaseModel):
    id: UUID
    ticker: str
    stock_name: str
    sector: str
    is_active: bool
    added_at: datetime

    model_config = {"from_attributes": True}


class WatchlistAddRequest(BaseModel):
    ticker: str


class DiscoverCandidate(BaseModel):
    ticker: str
    stock_name: str
    sector: str
    dividend_yield: float | None = None
    reasoning: str = ""
    already_in_watchlist: bool = False


class DiscoverResponse(BaseModel):
    candidates: list[DiscoverCandidate]
    summary: str = ""


class DiscoverAddRequest(BaseModel):
    tickers: list[str]
