from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class AllocateRequest(BaseModel):
    amount: float


class BuyPlanItem(BaseModel):
    ticker: str
    stock_name: str
    sector: str
    lots: int
    price: float
    cost: float
    dividend_yield: float | None = None
    dividend_per_lot: float | None = None
    reasoning: str = ""
    entry_signal: str | None = None
    entry_reasoning: str | None = None


class ImpactPreview(BaseModel):
    annual_dividend_before: float
    annual_dividend_after: float
    monthly_income_before: float
    monthly_income_after: float
    sector_balance_before: list[dict]
    sector_balance_after: list[dict]


class ProjectionRow(BaseModel):
    year: int
    portfolio_value: float
    annual_dividend: float
    monthly_income: float


class ScenarioProjection(BaseModel):
    label: str
    yield_rate: float
    rows: list[ProjectionRow]


class AllocateResponse(BaseModel):
    id: UUID
    items: list[BuyPlanItem]
    remainder: float
    summary: str
    impact: ImpactPreview
    projections: list[ScenarioProjection]
    is_fallback: bool = False


class ConfirmItemRequest(BaseModel):
    ticker: str
    lots: int


class ConfirmRequest(BaseModel):
    confirmed_items: list[ConfirmItemRequest]


class AllocationHistoryOut(BaseModel):
    id: UUID
    total_amount: float | None
    plan: dict | None
    projected_annual_dividend_before: float | None
    projected_annual_dividend_after: float | None
    executed: bool
    executed_items: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}
