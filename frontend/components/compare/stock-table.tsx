"use client";

import { useState } from "react";
import type { MarketData } from "@/types";
import { formatCurrency, formatYield } from "@/lib/utils";
import { SECTOR_LABELS } from "@/lib/constants";
import { SaleBadge } from "./sale-badge";

type SortKey =
  | "stock_name"
  | "last_close"
  | "dividend_yield"
  | "cost_per_lot"
  | "dividend_per_lot"
  | "war_fear_discount";

interface StockTableProps {
  data: MarketData[];
  currencySymbol: string;
}

export function StockTable({ data, currencySymbol }: StockTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("dividend_yield");
  const [sortAsc, setSortAsc] = useState(false);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const sorted = [...data].sort((a, b) => {
    const aVal = a[sortKey] ?? 0;
    const bVal = b[sortKey] ?? 0;

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  function SortHeader({
    label,
    field,
    align,
  }: {
    label: string;
    field: SortKey;
    align?: "right";
  }) {
    const active = sortKey === field;
    const arrow = active ? (sortAsc ? " ↑" : " ↓") : "";
    return (
      <th
        className={`cursor-pointer px-4 py-3 text-xs uppercase tracking-wide transition-colors hover:text-plutus-gold ${
          align === "right" ? "text-right" : "text-left"
        } ${active ? "text-plutus-gold" : "text-plutus-text-secondary"}`}
        onClick={() => handleSort(field)}
      >
        {label}
        {arrow}
      </th>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-plutus-border bg-plutus-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-plutus-border">
            <SortHeader label="Stock" field="stock_name" />
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-plutus-text-secondary">
              Sector
            </th>
            <SortHeader label="Price" field="last_close" align="right" />
            <SortHeader label="Yield" field="dividend_yield" align="right" />
            <th className="px-4 py-3 text-right text-xs uppercase tracking-wide text-plutus-text-secondary">
              52w High
            </th>
            <SortHeader label="Discount" field="war_fear_discount" align="right" />
            <SortHeader label="Cost/Lot" field="cost_per_lot" align="right" />
            <SortHeader label="Div/Lot/Yr" field="dividend_per_lot" align="right" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => (
            <tr
              key={item.ticker}
              className="border-b border-plutus-border/50 transition-colors hover:bg-plutus-surface-light"
            >
              <td className="px-4 py-3">
                <p className="font-medium text-plutus-text-primary">
                  {item.stock_name}
                </p>
                <p className="text-xs text-plutus-text-secondary">
                  {item.ticker}
                </p>
              </td>
              <td className="px-4 py-3 text-plutus-text-secondary">
                {SECTOR_LABELS[item.sector] || item.sector}
              </td>
              <td className="px-4 py-3 text-right font-financial">
                {formatCurrency(item.last_close, currencySymbol)}
              </td>
              <td className="px-4 py-3 text-right font-financial text-plutus-gold">
                {formatYield(item.dividend_yield)}
              </td>
              <td className="px-4 py-3 text-right font-financial text-plutus-text-secondary">
                {formatCurrency(item.week_52_high, currencySymbol)}
              </td>
              <td className="px-4 py-3 text-right">
                {item.is_sale_opportunity && item.war_fear_discount ? (
                  <SaleBadge discount={item.war_fear_discount} />
                ) : (
                  <span className="font-financial text-plutus-text-secondary">
                    {item.war_fear_discount != null
                      ? `-${item.war_fear_discount.toFixed(1)}%`
                      : "—"}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-financial">
                {formatCurrency(item.cost_per_lot, currencySymbol)}
              </td>
              <td className="px-4 py-3 text-right font-financial text-plutus-positive">
                {formatCurrency(item.dividend_per_lot, currencySymbol)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
