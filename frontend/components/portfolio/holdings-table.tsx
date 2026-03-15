"use client";

import type { Holding } from "@/types";
import { formatCurrency, formatPct, formatYield } from "@/lib/utils";
import { SECTOR_LABELS } from "@/lib/constants";

interface HoldingsTableProps {
  holdings: Holding[];
  currencySymbol: string;
}

export function HoldingsTable({ holdings, currencySymbol }: HoldingsTableProps) {
  if (holdings.length === 0) {
    return (
      <div className="rounded-xl border border-plutus-border bg-plutus-surface p-8 text-center text-plutus-text-secondary">
        No holdings yet. Add stocks from the Allocate page.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-plutus-border bg-plutus-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-plutus-border text-left text-xs uppercase tracking-wide text-plutus-text-secondary">
            <th className="px-4 py-3">Stock</th>
            <th className="px-4 py-3">Sector</th>
            <th className="px-4 py-3 text-right">Shares</th>
            <th className="px-4 py-3 text-right">Avg Buy</th>
            <th className="px-4 py-3 text-right">Price</th>
            <th className="px-4 py-3 text-right">Value</th>
            <th className="px-4 py-3 text-right">P&L</th>
            <th className="px-4 py-3 text-right">Yield</th>
            <th className="px-4 py-3 text-right">Div/Year</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => (
            <tr
              key={h.id}
              className="border-b border-plutus-border/50 transition-colors hover:bg-plutus-surface-light"
            >
              <td className="px-4 py-3">
                <p className="font-medium text-plutus-text-primary">
                  {h.stock_name}
                </p>
                <p className="text-xs text-plutus-text-secondary">{h.ticker}</p>
              </td>
              <td className="px-4 py-3 text-plutus-text-secondary">
                {SECTOR_LABELS[h.sector] || h.sector}
              </td>
              <td className="px-4 py-3 text-right font-financial">
                {h.shares.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right font-financial">
                {formatCurrency(h.avg_buy_price, currencySymbol)}
              </td>
              <td className="px-4 py-3 text-right font-financial">
                {formatCurrency(h.current_price, currencySymbol)}
              </td>
              <td className="px-4 py-3 text-right font-financial">
                {formatCurrency(h.market_value, currencySymbol)}
              </td>
              <td
                className={`px-4 py-3 text-right font-financial ${
                  (h.pnl ?? 0) >= 0
                    ? "text-plutus-positive"
                    : "text-plutus-negative"
                }`}
              >
                {formatCurrency(h.pnl, currencySymbol)}
                <br />
                <span className="text-xs">{formatPct(h.pnl_pct)}</span>
              </td>
              <td className="px-4 py-3 text-right font-financial text-plutus-gold">
                {formatYield(h.dividend_yield)}
              </td>
              <td className="px-4 py-3 text-right font-financial">
                {formatCurrency(h.annual_dividend_income, currencySymbol)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
