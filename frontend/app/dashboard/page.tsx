"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Profile, Holding, PortfolioSummary } from "@/types";
import { StatsRow } from "@/components/portfolio/stats-row";
import { HoldingsTable } from "@/components/portfolio/holdings-table";
import { SectorPie } from "@/components/portfolio/sector-pie";
import { WarChestBar } from "@/components/portfolio/war-chest-bar";

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [p, h, s] = await Promise.all([
          api.profiles.active(),
          api.portfolio.list(),
          api.portfolio.summary(),
        ]);
        setProfile(p);
        setHoldings(h);
        setSummary(s);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-plutus-text-primary">Dashboard</h2>

      {summary && <StatsRow summary={summary} currencySymbol={sym} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <HoldingsTable holdings={holdings} currencySymbol={sym} />
        </div>
        <div className="space-y-6">
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
