from uuid import UUID

from pydantic import BaseModel


class ProfileOut(BaseModel):
    id: UUID
    name: str
    currency: str
    currency_symbol: str
    ticker_suffix: str
    lot_size: int
    yield_band_min: float
    yield_band_max: float
    war_fear_threshold: float
    sector_targets: dict
    news_grounding_query: str | None
    rss_feeds: dict | None
    monthly_topup_default: float
    income_goal: float
    war_chest_balance: float
    war_chest_target: float
    is_active: bool

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    sector_targets: dict[str, float] | None = None
    yield_band_min: float | None = None
    yield_band_max: float | None = None
    war_fear_threshold: float | None = None
    monthly_topup_default: float | None = None
    income_goal: float | None = None
    war_chest_target: float | None = None


class AISuggestResponse(BaseModel):
    suggested_targets: dict[str, float]
    reasoning: str
