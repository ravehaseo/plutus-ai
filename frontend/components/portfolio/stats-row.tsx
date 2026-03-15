"use client";

import type { PortfolioSummary } from "@/types";
import { formatCurrency, formatPct, formatYield } from "@/lib/utils";

interface StatsRowProps {
  summary: PortfolioSummary;
  currencySymbol: string;
  saleOpportunityCount?: number;
}

function StatCard({
  label,
  value,
  subtext,
  accent,
}: {
  label: string;
  value: string;
  subtext?: string;
  accent?: "gold" | "positive" | "negative" | "default";
}) {
  const accentClass = {
    gold: "text-plutus-gold",
    positive: "text-plutus-positive",
    negative: "text-plutus-negative",
    default: "text-plutus-text-primary",
  }[accent || "default"];

  return (
    <div className="rounded-xl border border-plutus-border bg-plutus-surface p-5">
      <p className="text-xs uppercase tracking-wide text-plutus-text-secondary">
        {label}
      </p>
      <p className={`mt-1 font-financial text-2xl font-bold ${accentClass}`}>
        {value}
      </p>
      {subtext && (
        <p className="mt-1 text-xs text-plutus-text-secondary">{subtext}</p>
      )}
    </div>
  );
}

export function StatsRow({ summary, currencySymbol, saleOpportunityCount }: StatsRowProps) {
  const pnlAccent = summary.total_pnl >= 0 ? "positive" : "negative";

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <StatCard
        label="Portfolio Value"
        value={formatCurrency(summary.total_value, currencySymbol)}
        subtext={`P&L: ${formatCurrency(summary.total_pnl, currencySymbol)} (${formatPct(summary.total_pnl_pct)})`}
        accent={pnlAccent}
      />
      <StatCard
        label="Weighted Yield"
        value={formatYield(summary.weighted_yield)}
        accent="gold"
      />
      <StatCard
        label="Monthly Income"
        value={formatCurrency(summary.monthly_income, currencySymbol)}
        subtext={`Annual: ${formatCurrency(summary.annual_dividend, currencySymbol)}`}
        accent="gold"
      />
      <StatCard
        label="Years to Goal"
        value={
          summary.years_to_goal != null
            ? `${summary.years_to_goal} yrs`
            : "N/A"
        }
        subtext={`Target: ${formatCurrency(summary.income_goal, currencySymbol)}/mo`}
      />
      <StatCard
        label="Sale Opportunities"
        value={saleOpportunityCount != null ? `${saleOpportunityCount}` : "0"}
        subtext="Stocks below 52-week threshold"
        accent={saleOpportunityCount ? "gold" : "default"}
      />
    </div>
  );
}
