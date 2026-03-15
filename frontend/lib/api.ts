const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }

  return res.json();
}

export const api = {
  profiles: {
    list: () => request<import("@/types").Profile[]>("/api/v1/profiles"),
    active: () => request<import("@/types").Profile>("/api/v1/profiles/active"),
    activate: (id: string) =>
      request<import("@/types").Profile>(`/api/v1/profiles/${id}/activate`, {
        method: "POST",
      }),
    update: (data: import("@/types").ProfileUpdate) =>
      request<import("@/types").Profile>("/api/v1/profiles/active", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    suggestSectors: () =>
      request<import("@/types").AISuggestResponse>("/api/v1/profiles/active/suggest-sectors", {
        method: "POST",
      }),
  },

  portfolio: {
    list: () => request<import("@/types").Holding[]>("/api/v1/portfolio"),
    summary: () =>
      request<import("@/types").PortfolioSummary>("/api/v1/portfolio/summary"),
    add: (data: {
      ticker: string;
      stock_name: string;
      sector: string;
      shares: number;
      avg_buy_price?: number;
    }) =>
      request<import("@/types").Holding>("/api/v1/portfolio", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { shares?: number; avg_buy_price?: number }) =>
      request<import("@/types").Holding>(`/api/v1/portfolio/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request(`/api/v1/portfolio/${id}`, { method: "DELETE" }),
  },

  market: {
    watchlist: () =>
      request<import("@/types").MarketData[]>("/api/v1/market/watchlist"),
    refresh: () =>
      request<import("@/types").MarketData[]>("/api/v1/market/refresh", {
        method: "POST",
      }),
  },

  allocate: {
    generate: (amount: number) =>
      request<import("@/types").AllocateResponse>("/api/v1/allocate", {
        method: "POST",
        body: JSON.stringify({ amount }),
      }),
    confirm: (id: string, confirmed_items: { ticker: string; lots: number }[]) =>
      request<{ ok: boolean; total_spent: number; summary: import("@/types").PortfolioSummary }>(
        `/api/v1/allocate/${id}/confirm`,
        {
          method: "POST",
          body: JSON.stringify({ confirmed_items }),
        }
      ),
    history: () =>
      request<import("@/types").AllocationHistory[]>("/api/v1/allocate/history"),
  },
};
