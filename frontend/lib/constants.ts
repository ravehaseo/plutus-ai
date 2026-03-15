export const THEME = {
  gold: "#FFD700",
  background: "#1A1A1B",
  surface: "#2A2A2B",
  surfaceLight: "#3A3A3B",
  textPrimary: "#FAFAFA",
  textSecondary: "#A0A0A0",
  positive: "#22C55E",
  negative: "#EF4444",
  saleOpportunity: "#F59E0B",
} as const;

export const SECTOR_LABELS: Record<string, string> = {
  bank: "Banks",
  reit: "REITs",
  sin_stock: "Sin Stocks",
  cash: "Cash",
  financials: "Financials",
  telecom: "Telecom",
  industrials: "Industrials",
};

export const SECTOR_COLORS: Record<string, string> = {
  bank: "#FFD700",
  reit: "#60A5FA",
  sin_stock: "#F59E0B",
  cash: "#A0A0A0",
  financials: "#FFD700",
  telecom: "#34D399",
  industrials: "#A78BFA",
};
