export interface Profile {
  id: string;
  name: string;
  currency: string;
  currency_symbol: string;
  ticker_suffix: string;
  lot_size: number;
  yield_band_min: number;
  yield_band_max: number;
  war_fear_threshold: number;
  sector_targets: Record<string, number>;
  news_grounding_query: string | null;
  rss_feeds: Record<string, string> | null;
  monthly_topup_default: number;
  income_goal: number;
  war_chest_balance: number;
  war_chest_target: number;
  is_active: boolean;
}

export interface ProfileUpdate {
  sector_targets?: Record<string, number>;
  yield_band_min?: number;
  yield_band_max?: number;
  war_fear_threshold?: number;
  monthly_topup_default?: number;
  income_goal?: number;
  war_chest_target?: number;
}

export interface AISuggestResponse {
  suggested_targets: Record<string, number>;
  reasoning: string;
}

export interface Holding {
  id: string;
  ticker: string;
  stock_name: string;
  sector: string;
  shares: number;
  avg_buy_price: number | null;
  current_price: number | null;
  market_value: number | null;
  pnl: number | null;
  pnl_pct: number | null;
  dividend_yield: number | null;
  annual_dividend_income: number | null;
}

export interface SectorAllocation {
  sector: string;
  actual_pct: number;
  target_pct: number;
  diff_pct: number;
}

export interface ProjectionRow {
  year: number;
  portfolio_value: number;
  annual_dividend: number;
  monthly_income: number;
}

export interface ScenarioProjection {
  label: string;
  yield_rate: number;
  rows: ProjectionRow[];
}

export interface PortfolioSummary {
  total_value: number;
  total_cost: number;
  total_pnl: number;
  total_pnl_pct: number;
  weighted_yield: number;
  annual_dividend: number;
  monthly_income: number;
  years_to_goal: number | null;
  war_chest_balance: number;
  war_chest_target: number;
  income_goal: number;
  monthly_topup: number;
  sector_allocations: SectorAllocation[];
  projections: ScenarioProjection[];
}

export interface MarketData {
  ticker: string;
  stock_name: string;
  sector: string;
  last_close: number | null;
  week_52_high: number | null;
  week_52_low: number | null;
  dividend_yield: number | null;
  annual_dividend: number | null;
  pe_ratio: number | null;
  market_cap: number | null;
  cost_per_lot: number | null;
  dividend_per_lot: number | null;
  war_fear_discount: number | null;
  is_sale_opportunity: boolean;
  entry_signal: string | null;
  entry_reasoning: string | null;
  fetched_at: string | null;
}

export interface BuyPlanItem {
  ticker: string;
  stock_name: string;
  sector: string;
  lots: number;
  price: number;
  cost: number;
  dividend_yield: number | null;
  dividend_per_lot: number | null;
  reasoning: string;
  entry_signal: string | null;
  entry_reasoning: string | null;
}

export interface WatchlistItem {
  id: string;
  ticker: string;
  stock_name: string;
  sector: string;
  is_active: boolean;
  added_at: string;
}

export interface DiscoverCandidate {
  ticker: string;
  stock_name: string;
  sector: string;
  dividend_yield: number | null;
  reasoning: string;
  already_in_watchlist: boolean;
}

export interface DiscoverResponse {
  candidates: DiscoverCandidate[];
  summary: string;
}

export interface ImpactPreview {
  annual_dividend_before: number;
  annual_dividend_after: number;
  monthly_income_before: number;
  monthly_income_after: number;
  sector_balance_before: SectorAllocation[];
  sector_balance_after: SectorAllocation[];
}

export interface AllocateResponse {
  id: string;
  items: BuyPlanItem[];
  remainder: number;
  summary: string;
  impact: ImpactPreview;
  projections: ScenarioProjection[];
  is_fallback: boolean;
}

export interface AllocationHistory {
  id: string;
  total_amount: number | null;
  plan: {
    items: BuyPlanItem[];
    remainder: number;
    summary: string;
  } | null;
  projected_annual_dividend_before: number | null;
  projected_annual_dividend_after: number | null;
  executed: boolean;
  executed_items: {
    confirmed: { ticker: string; lots: number; cost: number }[];
    total_spent: number;
  } | null;
  created_at: string;
}
