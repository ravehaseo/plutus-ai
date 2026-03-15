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
  sector_allocations: SectorAllocation[];
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
  fetched_at: string | null;
}
