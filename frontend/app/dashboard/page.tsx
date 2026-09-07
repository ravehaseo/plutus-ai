"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Profile, Holding, PortfolioSummary, MarketData } from "@/types";
import { StatsRow } from "@/components/portfolio/stats-row";
import { HoldingsTable } from "@/components/portfolio/holdings-table";
import { SectorPie } from "@/components/portfolio/sector-pie";
import { WarChestBar } from "@/components/portfolio/war-chest-bar";

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<Record<string, { risk_level: string; summary: string }> | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [p, h, s, m] = await Promise.all([
          api.profiles.active(),
          api.portfolio.list(),
          api.portfolio.summary(),
          api.market.watchlist().catch(() => [] as MarketData[]),
        ]);
        setProfile(p);
        setHoldings(h);
        setSummary(s);
        setMarketData(m);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleHealthCheck() {
    setHealthLoading(true);
    try {
      const res = await api.portfolio.healthCheck();
      setHealth(res);
    } catch (err) {
      // best-effort: keep silent, user can re-run
      console.error(err);
    } finally {
      setHealthLoading(false);
    }
  }

  async function refetchHoldings() {
    try {
      const h = await api.portfolio.list();
      setHoldings(h);
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl bg-plutus-surface"
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
  const saleCount = marketData.filter((m) => m.is_sale_opportunity).length;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-plutus-text-primary">Dashboard</h2>

      {summary && <StatsRow summary={summary} currencySymbol={sym} saleOpportunityCount={saleCount} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Link
            href="/allocate"
            className="block rounded-xl border border-plutus-gold/30 bg-gradient-to-r from-plutus-gold/10 to-plutus-gold/5 p-5 transition-all hover:border-plutus-gold/60 hover:from-plutus-gold/15 hover:to-plutus-gold/10 group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-plutus-gold">Allocate My Money</h3>
                <p className="text-sm text-plutus-text-secondary mt-1">
                  Get AI-powered buy recommendations based on your portfolio and market data
                </p>
              </div>
              <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>

          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-plutus-text-primary">
              Holdings
            </h3>
            <button
              onClick={handleHealthCheck}
              disabled={healthLoading}
              className="rounded-md bg-plutus-surface px-3 py-1.5 text-xs text-plutus-text-secondary hover:text-plutus-text-primary disabled:opacity-50"
            >
              {healthLoading ? "Checking..." : "Run Health Check"}
            </button>
          </div>
          <HoldingsTable holdings={holdings} currencySymbol={sym} healthMap={health || undefined} onHoldingUpdate={refetchHoldings} />
        </div>
        <div className="space-y-6">
          {saleCount > 0 && (
            <div className="rounded-xl border border-plutus-sale/30 bg-plutus-sale/10 p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-plutus-sale text-xs font-bold text-plutus-bg">
                  {saleCount}
                </span>
                <h3 className="font-semibold text-plutus-sale">
                  Sale Opportunit{saleCount === 1 ? "y" : "ies"}
                </h3>
              </div>
              <ul className="space-y-1">
                {marketData
                  .filter((m) => m.is_sale_opportunity)
                  .map((m) => (
                    <li key={m.ticker} className="text-sm text-plutus-text-secondary flex justify-between">
                      <span>{m.stock_name}</span>
                      <span className="font-financial text-plutus-sale">
                        {m.war_fear_discount != null
                          ? `-${m.war_fear_discount.toFixed(1)}%`
                          : ""}
                      </span>
                    </li>
                  ))}
              </ul>
              <Link
                href="/allocate"
                className="mt-3 block text-center text-sm font-medium text-plutus-gold hover:underline"
              >
                Invest now →
              </Link>
            </div>
          )}

          {summary && <SectorPie allocations={summary.sector_allocations} />}
          {summary && (
            <WarChestBar
              balance={summary.war_chest_balance}
              target={summary.war_chest_target}
              currencySymbol={sym}
            />
          )}
        </div>
      </div>
    </div>
  );
}
