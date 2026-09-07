"use client";

import type { BuyPlanItem } from "@/types";
import { formatCurrency, formatPrice, formatYield } from "@/lib/utils";
import { SECTOR_LABELS, ENTRY_SIGNAL_CONFIG } from "@/lib/constants";

interface BuyPlanTableProps {
  items: BuyPlanItem[];
  remainder: number;
  currencySymbol: string;
}

export function BuyPlanTable({ items, remainder, currencySymbol }: BuyPlanTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-plutus-border bg-plutus-surface p-8 text-center">
        <p className="text-plutus-text-secondary">No buy recommendations generated.</p>
      </div>
    );
  }

  const totalCost = items.reduce((sum, i) => sum + i.cost, 0);

  return (
    <div className="rounded-xl border border-plutus-border bg-plutus-surface overflow-hidden">
      <div className="border-b border-plutus-border px-5 py-3">
        <h3 className="font-semibold text-plutus-text-primary">Recommended Buy Plan</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-plutus-border text-left text-xs uppercase tracking-wide text-plutus-text-secondary">
              <th className="px-5 py-3">Stock</th>
              <th className="px-5 py-3">Sector</th>
              <th className="px-5 py-3 text-right">Price</th>
              <th className="px-5 py-3 text-right">Lots</th>
              <th className="px-5 py-3 text-right">Cost</th>
              <th className="px-5 py-3 text-right">Yield</th>
              <th className="px-5 py-3 text-center">Entry</th>
              <th className="px-5 py-3">Reasoning</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.ticker}
                className="border-b border-plutus-border/50 hover:bg-plutus-gold/5 transition-colors"
              >
                <td className="px-5 py-3">
                  <div className="font-medium text-plutus-text-primary">{item.stock_name}</div>
                  <div className="text-xs text-plutus-text-secondary">{item.ticker}</div>
                </td>
                <td className="px-5 py-3 text-plutus-text-secondary">
                  {SECTOR_LABELS[item.sector] || item.sector}
                </td>
                <td className="px-5 py-3 text-right font-financial text-plutus-text-primary">
                  {formatPrice(item.price, currencySymbol)}
                </td>
                <td className="px-5 py-3 text-right font-financial text-plutus-gold font-bold">
                  {item.lots}
                </td>
                <td className="px-5 py-3 text-right font-financial text-plutus-text-primary">
                  {formatPrice(item.cost, currencySymbol)}
                </td>
                <td className="px-5 py-3 text-right font-financial text-plutus-positive">
                  {formatYield(item.dividend_yield)}
                </td>
                <td className="px-5 py-3 text-center">
                  {item.entry_signal && ENTRY_SIGNAL_CONFIG[item.entry_signal] ? (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ENTRY_SIGNAL_CONFIG[item.entry_signal].color} ${ENTRY_SIGNAL_CONFIG[item.entry_signal].bg}`}
                      title={item.entry_reasoning || undefined}
                    >
                      {ENTRY_SIGNAL_CONFIG[item.entry_signal].label}
                    </span>
                  ) : (
                    <span className="text-xs text-plutus-text-secondary">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-xs text-plutus-text-secondary max-w-xs">
                  {item.reasoning}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-plutus-gold/5">
              <td colSpan={4} className="px-5 py-3 font-semibold text-plutus-gold">Total</td>
              <td className="px-5 py-3 text-right font-financial font-bold text-plutus-gold">
                {formatCurrency(totalCost, currencySymbol)}
              </td>
              <td colSpan={3} className="px-5 py-3 text-right text-sm text-plutus-text-secondary">
                Remainder: {formatCurrency(remainder, currencySymbol)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
