from uuid import UUID
from pydantic import BaseModel


class HoldingCreate(BaseModel):
    ticker: str
    stock_name: str
    sector: str
    shares: int
    avg_buy_price: float | None = None


class HoldingUpdate(BaseModel):
    shares: int | None = None
    avg_buy_price: float | None = None


class HoldingOut(BaseModel):
    id: UUID
    ticker: str
    stock_name: str
    sector: str
    shares: int
    avg_buy_price: float | None
    current_price: float | None = None
    market_value: float | None = None
    pnl: float | None = None
    pnl_pct: float | None = None
    dividend_yield: float | None = None
    annual_dividend_income: float | None = None

    model_config = {"from_attributes": True}


class SectorAllocation(BaseModel):
    sector: str
    actual_pct: float
    target_pct: float
    diff_pct: float


class ProjectionRow(BaseModel):
    year: int
    portfolio_value: float
    annual_dividend: float
    monthly_income: float


class ScenarioProjection(BaseModel):
    label: str
    yield_rate: float
    rows: list[ProjectionRow]


class PortfolioSummary(BaseModel):
    total_value: float
    total_cost: float
    total_pnl: float
    total_pnl_pct: float
    weighted_yield: float
    annual_dividend: float
    monthly_income: float
    years_to_goal: float | None
    war_chest_balance: float
    war_chest_target: float
    income_goal: float
    monthly_topup: float
    sector_allocations: list[SectorAllocation]
    projections: list[ScenarioProjection] = []
