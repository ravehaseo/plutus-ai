"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Profile, MarketData } from "@/types";
import { StockTable } from "@/components/compare/stock-table";

export default function ComparePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [data, setData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [p, d] = await Promise.all([
          api.profiles.active(),
          api.market.watchlist(),
        ]);
        setProfile(p);
        setData(d);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const fresh = await api.market.refresh();
      setData(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-lg bg-plutus-surface"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-plutus-negative/30 bg-plutus-negative/10 p-6 text-center">
        <p className="text-plutus-negative">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 rounded-lg bg-plutus-surface px-4 py-2 text-sm text-plutus-text-primary hover:bg-plutus-surface-light"
        >
          Retry
        </button>
      </div>
    );
  }

  const sym = profile?.currency_symbol || "RM";
  const saleCount = data.filter((d) => d.is_sale_opportunity).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-plutus-text-primary">
            Stock Comparison
          </h2>
          <p className="text-sm text-plutus-text-secondary">
            {data.length} stocks tracked
            {saleCount > 0 && (
              <span className="ml-2 text-plutus-sale">
                · {saleCount} Sale Opportunit{saleCount === 1 ? "y" : "ies"}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded-lg bg-plutus-gold px-4 py-2 text-sm font-medium text-plutus-bg transition-colors hover:bg-plutus-gold-dim disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh Prices"}
        </button>
      </div>

      <StockTable data={data} currencySymbol={sym} />
    </div>
  );
}
