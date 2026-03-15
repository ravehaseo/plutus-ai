"use client";

import { useState } from "react";
import type { ScenarioProjection } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface ProjectionTableProps {
  projections: ScenarioProjection[];
  currencySymbol: string;
}

export function ProjectionTable({ projections, currencySymbol }: ProjectionTableProps) {
  const [activeTab, setActiveTab] = useState(1);

  if (!projections.length) return null;

  const years = projections[0]?.rows.length || 10;

  return (
    <div className="rounded-xl border border-plutus-border bg-plutus-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-plutus-border px-5 py-3">
        <h3 className="font-semibold text-plutus-text-primary">10-Year Projection</h3>
        <div className="flex gap-1">
          {projections.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setActiveTab(i)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                activeTab === i
                  ? "bg-plutus-gold text-plutus-bg"
                  : "text-plutus-text-secondary hover:text-plutus-text-primary hover:bg-plutus-surface-light"
              }`}
            >
              {p.label} ({(p.yield_rate * 100).toFixed(1)}%)
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-plutus-border text-left text-xs uppercase tracking-wide text-plutus-text-secondary">
              <th className="px-5 py-3">Year</th>
              <th className="px-5 py-3 text-right">Portfolio Value</th>
              <th className="px-5 py-3 text-right">Annual Dividend</th>
              <th className="px-5 py-3 text-right">Monthly Income</th>
            </tr>
          </thead>
          <tbody>
            {projections[activeTab]?.rows.map((row) => (
              <tr
                key={row.year}
                className={`border-b border-plutus-border/30 hover:bg-plutus-gold/5 transition-colors ${
                  row.year === 0 ? "bg-plutus-gold/5" : ""
                }`}
              >
                <td className="px-5 py-2.5 text-plutus-text-secondary">
                  {row.year === 0 ? (
                    <span className="font-medium text-plutus-gold">Now</span>
                  ) : (
                    `Year ${row.year}`
                  )}
                </td>
                <td className="px-5 py-2.5 text-right font-financial text-plutus-text-primary">
                  {formatCurrency(row.portfolio_value, currencySymbol)}
                </td>
                <td className="px-5 py-2.5 text-right font-financial text-plutus-positive">
                  {formatCurrency(row.annual_dividend, currencySymbol)}
                </td>
                <td className="px-5 py-2.5 text-right font-financial text-plutus-gold font-bold">
                  {formatCurrency(row.monthly_income, currencySymbol)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
