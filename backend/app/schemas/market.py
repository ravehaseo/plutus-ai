from pydantic import BaseModel


class MarketDataOut(BaseModel):
    ticker: str
    stock_name: str
    sector: str
    last_close: float | None
    week_52_high: float | None
    week_52_low: float | None
    dividend_yield: float | None
    annual_dividend: float | None
    pe_ratio: float | None
    market_cap: int | None
    cost_per_lot: float | None
    dividend_per_lot: float | None
    war_fear_discount: float | None
    is_sale_opportunity: bool
    fetched_at: str | None = None
