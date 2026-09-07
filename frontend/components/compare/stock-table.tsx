"use client";

import { useState } from "react";
import type { MarketData } from "@/types";
import { formatPrice, formatYield } from "@/lib/utils";
import { SECTOR_LABELS } from "@/lib/constants";
import { SaleBadge } from "./sale-badge";
import { EntrySignalBadge } from "./entry-signal-badge";

type SortKey =
  | "stock_name"
  | "ticker"
  | "sector"
  | "last_close"
  | "dividend_yield"
  | "week_52_high"
  | "war_fear_discount"
  | "cost_per_lot"
  | "dividend_per_lot"
  | "entry_signal";

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

  const entryOrder: Record<string, number> = {
    strong_buy: 3,
    buy: 2,
    hold: 1,
    wait: 0,
  };

  const sorted = [...data].sort((a, b) => {
    if (sortKey === "entry_signal") {
      const aRank = a.entry_signal ? entryOrder[a.entry_signal] ?? -1 : -1;
      const bRank = b.entry_signal ? entryOrder[b.entry_signal] ?? -1 : -1;
      return sortAsc ? aRank - bRank : bRank - aRank;
    }

    const aVal = (a as any)[sortKey] ?? 0;
    const bVal = (b as any)[sortKey] ?? 0;

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
            <SortHeader label="Sector" field="sector" />
            <SortHeader label="Price" field="last_close" align="right" />
            <SortHeader label="Yield" field="dividend_yield" align="right" />
            <SortHeader label="52w High" field="week_52_high" align="right" />
            <SortHeader label="Discount" field="war_fear_discount" align="right" />
            <SortHeader label="Cost/Lot" field="cost_per_lot" align="right" />
            <SortHeader label="Div/Lot/Yr" field="dividend_per_lot" align="right" />
            <SortHeader label="Entry" field="entry_signal" />
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
                {formatPrice(item.last_close, currencySymbol)}
              </td>
              <td className="px-4 py-3 text-right font-financial text-plutus-gold">
                {formatYield(item.dividend_yield)}
              </td>
              <td className="px-4 py-3 text-right font-financial text-plutus-text-secondary">
                {formatPrice(item.week_52_high, currencySymbol)}
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
                {formatPrice(item.cost_per_lot, currencySymbol)}
              </td>
              <td className="px-4 py-3 text-right font-financial text-plutus-positive">
                {formatPrice(item.dividend_per_lot, currencySymbol)}
              </td>
              <td className="px-4 py-3 text-center">
                <EntrySignalBadge
                  signal={item.entry_signal}
                  reasoning={item.entry_reasoning}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
