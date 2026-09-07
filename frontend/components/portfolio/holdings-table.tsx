"use client";

import { useState } from "react";
import type { Holding } from "@/types";
import { formatCurrency, formatPrice, formatPct, formatYield } from "@/lib/utils";
import { SECTOR_LABELS } from "@/lib/constants";
import { api } from "@/lib/api";

interface HoldingsTableProps {
  holdings: Holding[];
  currencySymbol: string;
  healthMap?: Record<string, { risk_level: string; summary: string }>;
  onHoldingUpdate?: () => void;
}

export function HoldingsTable({ holdings, currencySymbol, healthMap, onHoldingUpdate }: HoldingsTableProps) {
  const [editingAvgPrice, setEditingAvgPrice] = useState<string | null>(null);
  const [draftAvgPrice, setDraftAvgPrice] = useState("");
  const [editingShares, setEditingShares] = useState<string | null>(null);
  const [draftShares, setDraftShares] = useState("");
  const [saving, setSaving] = useState(false);
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
            <th className="px-4 py-3 text-right">Health</th>
            <th className="px-4 py-3 text-right">Risk</th>
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
                {editingShares === h.id ? (
                  <span className="inline-flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draftShares}
                      onChange={(e) => setDraftShares(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const v = parseInt(draftShares, 10);
                          if (Number.isFinite(v) && v >= 0) {
                            setSaving(true);
                            api.portfolio
                              .update(h.id, { shares: v })
                              .then(() => {
                                onHoldingUpdate?.();
                                setEditingShares(null);
                                setDraftShares("");
                              })
                              .finally(() => setSaving(false));
                          }
                        }
                        if (e.key === "Escape") {
                          setEditingShares(null);
                          setDraftShares("");
                        }
                      }}
                      onBlur={() => {
                        const v = parseInt(draftShares, 10);
                        if (Number.isFinite(v) && v >= 0) {
                          setSaving(true);
                          api.portfolio
                            .update(h.id, { shares: v })
                            .then(() => {
                              onHoldingUpdate?.();
                              setEditingShares(null);
                              setDraftShares("");
                            })
                            .finally(() => setSaving(false));
                        } else {
                          setEditingShares(null);
                          setDraftShares("");
                        }
                      }}
                      autoFocus
                      disabled={saving}
                      className="w-24 rounded border border-plutus-border bg-plutus-bg px-2 py-1 text-right text-sm tabular-nums focus:border-plutus-gold focus:outline-none disabled:opacity-60"
                    />
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    {h.shares.toLocaleString()}
                    {onHoldingUpdate && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingShares(h.id);
                          setDraftShares(String(h.shares));
                        }}
                        className="text-plutus-text-secondary hover:text-plutus-gold text-xs px-1"
                        title="Edit shares (lots x lot size)"
                        aria-label="Edit shares"
                      >
                        ✎
                      </button>
                    )}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-financial">
                {editingAvgPrice === h.id ? (
                  <span className="inline-flex items-center gap-1">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={draftAvgPrice}
                      onChange={(e) => setDraftAvgPrice(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const v = parseFloat(draftAvgPrice);
                          if (Number.isFinite(v) && v >= 0) {
                            setSaving(true);
                            api.portfolio.update(h.id, { avg_buy_price: v }).then(() => {
                              onHoldingUpdate?.();
                              setEditingAvgPrice(null);
                              setDraftAvgPrice("");
                            }).finally(() => setSaving(false));
                          }
                        }
                        if (e.key === "Escape") {
                          setEditingAvgPrice(null);
                          setDraftAvgPrice("");
                        }
                      }}
                      onBlur={() => {
                        const v = parseFloat(draftAvgPrice);
                        if (Number.isFinite(v) && v >= 0) {
                          setSaving(true);
                          api.portfolio.update(h.id, { avg_buy_price: v }).then(() => {
                            onHoldingUpdate?.();
                            setEditingAvgPrice(null);
                            setDraftAvgPrice("");
                          }).finally(() => setSaving(false));
                        } else {
                          setEditingAvgPrice(null);
                          setDraftAvgPrice("");
                        }
                      }}
                      autoFocus
                      disabled={saving}
                      className="w-24 rounded border border-plutus-border bg-plutus-bg px-2 py-1 text-right text-sm tabular-nums focus:border-plutus-gold focus:outline-none disabled:opacity-60"
                    />
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    {formatPrice(h.avg_buy_price, currencySymbol)}
                    {onHoldingUpdate && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAvgPrice(h.id);
                          setDraftAvgPrice(String(h.avg_buy_price ?? ""));
                        }}
                        className="text-plutus-text-secondary hover:text-plutus-gold text-xs px-1"
                        title="Edit buy price"
                        aria-label="Edit average buy price"
                      >
                        ✎
                      </button>
                    )}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-financial">
                {formatPrice(h.current_price, currencySymbol)}
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
              <td className="px-4 py-3 text-right">
                {h.health_flags && h.health_flags.length > 0 ? (
                  <span
                    className="inline-flex items-center rounded-full bg-plutus-negative/10 px-2 py-0.5 text-xs text-plutus-negative"
                    title={h.health_flags.join(", ")}
                  >
                    Check
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-plutus-positive/10 px-2 py-0.5 text-xs text-plutus-positive">
                    OK
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {healthMap && healthMap[h.ticker] ? (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                      healthMap[h.ticker].risk_level === "high"
                        ? "bg-plutus-negative/10 text-plutus-negative"
                        : healthMap[h.ticker].risk_level === "medium"
                        ? "bg-yellow-500/10 text-yellow-400"
                        : "bg-plutus-positive/10 text-plutus-positive"
                    }`}
                    title={healthMap[h.ticker].summary}
                  >
                    {healthMap[h.ticker].risk_level.toUpperCase()}
                  </span>
                ) : (
                  <span className="text-xs text-plutus-text-secondary">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
