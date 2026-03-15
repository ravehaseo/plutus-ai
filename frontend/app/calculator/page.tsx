"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import type { Profile, PortfolioSummary, ScenarioProjection } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { ProjectionTable } from "@/components/allocate/projection-table";

export default function CalculatorPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [topup, setTopup] = useState<number>(0);

  useEffect(() => {
    async function load() {
      try {
        const [p, s] = await Promise.all([
          api.profiles.active(),
          api.portfolio.summary(),
        ]);
        setProfile(p);
        setSummary(s);
        setTopup(s.monthly_topup);
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const adjustedProjections = useMemo<ScenarioProjection[]>(() => {
    if (!summary) return [];
    if (topup === summary.monthly_topup) return summary.projections;

    const rates = [0.04, Math.max(summary.weighted_yield, 0.01), 0.07];
    const labels = ["Conservative", "Base", "Optimistic"];

    return rates.map((rate, i) => {
      const annDivNow = summary.total_value * rate;
      const rows = [{
        year: 0,
        portfolio_value: Math.round(summary.total_value * 100) / 100,
        annual_dividend: Math.round(annDivNow * 100) / 100,
        monthly_income: Math.round((annDivNow / 12) * 100) / 100,
      }];
      for (let year = 1; year <= 10; year++) {
        const rn = rate / 12;
        const nt = 12 * year;
        const growth = Math.pow(1 + rn, nt);
        const fv =
          rate > 0
            ? summary.total_value * growth + topup * (growth - 1) / rn
            : summary.total_value + topup * 12 * year;
        const annDiv = fv * rate;
        rows.push({
          year,
          portfolio_value: Math.round(fv * 100) / 100,
          annual_dividend: Math.round(annDiv * 100) / 100,
          monthly_income: Math.round((annDiv / 12) * 100) / 100,
        });
      }
      return { label: labels[i], yield_rate: rate, rows };
    });
  }, [summary, topup]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-plutus-surface" />
        ))}
      </div>
    );
  }

  if (!summary || !profile) {
    return (
      <div className="rounded-xl border border-plutus-border bg-plutus-surface p-8 text-center">
        <p className="text-plutus-text-secondary">
          No portfolio data yet. Add holdings first.
        </p>
      </div>
    );
  }

  const sym = profile.currency_symbol || "RM";
  const goalPct = summary.income_goal > 0
    ? Math.min((summary.monthly_income / summary.income_goal) * 100, 100)
    : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-plutus-text-primary">Income Goal Tracker</h2>

      <div className="rounded-xl border border-plutus-border bg-plutus-surface p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wide text-plutus-text-secondary">
            Monthly Income Progress
          </p>
          <p className="text-xs text-plutus-text-secondary">
            Target: {formatCurrency(summary.income_goal, sym)}/mo
          </p>
        </div>

        <div className="relative h-6 overflow-hidden rounded-full bg-plutus-bg">
          <div
            className="h-full rounded-full bg-gradient-to-r from-plutus-gold/80 to-plutus-gold transition-all duration-700"
            style={{ width: `${goalPct}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-plutus-text-primary">
            {goalPct.toFixed(1)}%
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-plutus-text-secondary">Current Monthly</p>
            <p className="font-financial text-xl font-bold text-plutus-gold">
              {formatCurrency(summary.monthly_income, sym)}
            </p>
          </div>
          <div>
            <p className="text-xs text-plutus-text-secondary">Goal</p>
            <p className="font-financial text-xl font-bold text-plutus-text-primary">
              {formatCurrency(summary.income_goal, sym)}
            </p>
          </div>
          <div>
            <p className="text-xs text-plutus-text-secondary">Years to Goal</p>
            <p className="font-financial text-xl font-bold text-plutus-positive">
              {summary.years_to_goal != null ? `${summary.years_to_goal} yrs` : "N/A"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-plutus-border bg-plutus-surface p-6">
        <label className="block text-sm font-medium text-plutus-text-secondary mb-3">
          Adjust Monthly Top-up ({sym})
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={Math.max(topup * 4, 5000)}
            step={100}
            value={topup}
            onChange={(e) => setTopup(Number(e.target.value))}
            className="flex-1 h-2 rounded-full appearance-none bg-plutus-bg accent-plutus-gold cursor-pointer"
          />
          <span className="font-financial text-lg font-bold text-plutus-gold w-32 text-right">
            {formatCurrency(topup, sym)}
          </span>
        </div>
        {topup !== summary.monthly_topup && (
          <p className="mt-2 text-xs text-plutus-text-secondary">
            Default: {formatCurrency(summary.monthly_topup, sym)} —{" "}
            <button
              onClick={() => setTopup(summary.monthly_topup)}
              className="text-plutus-gold hover:underline"
            >
              Reset
            </button>
          </p>
        )}
      </div>

      <ProjectionTable projections={adjustedProjections} currencySymbol={sym} />
    </div>
  );
}
