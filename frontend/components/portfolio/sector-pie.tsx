"use client";

import type { SectorAllocation } from "@/types";
import { SECTOR_LABELS, SECTOR_COLORS } from "@/lib/constants";

interface SectorPieProps {
  allocations: SectorAllocation[];
}

export function SectorPie({ allocations }: SectorPieProps) {
  if (allocations.length === 0) return null;

  const total = allocations.reduce((sum, a) => sum + a.actual_pct, 0);

  return (
    <div className="rounded-xl border border-plutus-border bg-plutus-surface p-5">
      <h3 className="mb-4 text-sm font-medium text-plutus-text-primary">
        Sector Allocation
      </h3>

      <div className="space-y-3">
        {allocations.map((a) => {
          const color = SECTOR_COLORS[a.sector] || "#666";
          const diff = a.diff_pct;
          const diffColor =
            Math.abs(diff) < 2
              ? "text-plutus-text-secondary"
              : diff > 0
                ? "text-plutus-positive"
                : "text-plutus-negative";

          return (
            <div key={a.sector}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-plutus-text-primary">
                  {SECTOR_LABELS[a.sector] || a.sector}
                </span>
                <span className="font-financial text-plutus-text-secondary">
                  {a.actual_pct.toFixed(1)}% / {a.target_pct.toFixed(1)}%
                  <span className={`ml-2 ${diffColor}`}>
                    ({diff >= 0 ? "+" : ""}
                    {diff.toFixed(1)}%)
                  </span>
                </span>
              </div>

              <div className="relative h-2 overflow-hidden rounded-full bg-plutus-bg">
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(a.actual_pct, 100)}%`,
                    backgroundColor: color,
                  }}
                />
                <div
                  className="absolute top-0 h-full w-0.5 bg-white/50"
                  style={{ left: `${Math.min(a.target_pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
