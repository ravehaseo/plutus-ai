"use client";

import type { ImpactPreview as ImpactPreviewType, SectorAllocation } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { SECTOR_LABELS, SECTOR_COLORS } from "@/lib/constants";

interface ImpactPreviewProps {
  impact: ImpactPreviewType;
  currencySymbol: string;
}

function MetricCard({
  label,
  before,
  after,
  currencySymbol,
}: {
  label: string;
  before: number;
  after: number;
  currencySymbol: string;
}) {
  const change = after - before;
  const isPositive = change >= 0;

  return (
    <div className="rounded-xl border border-plutus-border bg-plutus-surface p-5">
      <p className="text-xs uppercase tracking-wide text-plutus-text-secondary mb-3">{label}</p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-plutus-text-secondary">Before</p>
          <p className="font-financial text-lg text-plutus-text-primary">
            {formatCurrency(before, currencySymbol)}
          </p>
        </div>
        <div className="text-2xl text-plutus-text-secondary/40 px-2">→</div>
        <div className="text-right">
          <p className="text-xs text-plutus-text-secondary">After</p>
          <p className="font-financial text-lg text-plutus-gold font-bold">
            {formatCurrency(after, currencySymbol)}
          </p>
        </div>
      </div>
      <p className={`mt-2 text-xs font-medium ${isPositive ? "text-plutus-positive" : "text-plutus-negative"}`}>
        {isPositive ? "+" : ""}{formatCurrency(change, currencySymbol)} / month
      </p>
    </div>
  );
}

function SectorBar({ allocations, label }: { allocations: SectorAllocation[]; label: string }) {
  return (
    <div>
      <p className="text-xs text-plutus-text-secondary mb-1.5">{label}</p>
      <div className="flex h-4 overflow-hidden rounded-full bg-plutus-bg">
        {allocations
          .filter((a) => a.actual_pct > 0)
          .map((a) => (
            <div
              key={a.sector}
              className="h-full transition-all"
              style={{
                width: `${a.actual_pct}%`,
                backgroundColor: SECTOR_COLORS[a.sector] || "#666",
              }}
              title={`${SECTOR_LABELS[a.sector] || a.sector}: ${a.actual_pct.toFixed(1)}%`}
            />
          ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
        {allocations
          .filter((a) => a.actual_pct > 0 || a.target_pct > 0)
          .map((a) => (
            <span key={a.sector} className="text-[10px] text-plutus-text-secondary">
              <span
                className="inline-block w-2 h-2 rounded-full mr-0.5"
                style={{ backgroundColor: SECTOR_COLORS[a.sector] || "#666" }}
              />
              {SECTOR_LABELS[a.sector] || a.sector} {a.actual_pct.toFixed(1)}%
            </span>
          ))}
      </div>
    </div>
  );
}

export function ImpactPreview({ impact, currencySymbol }: ImpactPreviewProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-plutus-text-primary">Impact Preview</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          label="Annual Dividend"
          before={impact.annual_dividend_before}
          after={impact.annual_dividend_after}
          currencySymbol={currencySymbol}
        />
        <MetricCard
          label="Monthly Income"
          before={impact.monthly_income_before}
          after={impact.monthly_income_after}
          currencySymbol={currencySymbol}
        />
      </div>
      <div className="rounded-xl border border-plutus-border bg-plutus-surface p-5 space-y-4">
        <p className="text-xs uppercase tracking-wide text-plutus-text-secondary">
          Sector Balance Change
        </p>
        <SectorBar allocations={impact.sector_balance_before} label="Before" />
        <SectorBar allocations={impact.sector_balance_after} label="After" />
      </div>
    </div>
  );
}
