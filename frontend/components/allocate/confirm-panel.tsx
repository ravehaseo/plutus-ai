"use client";

import { useState, useEffect } from "react";
import type { BuyPlanItem } from "@/types";
import { formatCurrency, formatPrice } from "@/lib/utils";
import { SECTOR_LABELS } from "@/lib/constants";

interface ConfirmPanelProps {
  items: BuyPlanItem[];
  currencySymbol: string;
  onConfirm: (confirmedItems: { ticker: string; lots: number; price?: number }[]) => void;
  loading: boolean;
  confirmed: boolean;
}

export function ConfirmPanel({ items, currencySymbol, onConfirm, loading, confirmed }: ConfirmPanelProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map((i) => [i.ticker, true]))
  );
  /** Optional per-ticker price override (actual buy price, e.g. 0.875). */
  const [priceOverride, setPriceOverride] = useState<Record<string, string>>({});
  /** Optional per-ticker lots override (actual quantity of lots bought). */
  const [lotsOverride, setLotsOverride] = useState<Record<string, string>>({});

  const tickerKey = items.map((i) => i.ticker).join(",");
  useEffect(() => {
    setChecked(Object.fromEntries(items.map((i) => [i.ticker, true])));
    setPriceOverride({});
    setLotsOverride({});
  }, [tickerKey]);

  function toggleAll(val: boolean) {
    setChecked(Object.fromEntries(items.map((i) => [i.ticker, val])));
  }

  function effectivePrice(item: BuyPlanItem): number {
    const raw = priceOverride[item.ticker]?.trim();
    if (raw === "") return item.price;
    const num = parseFloat(raw);
    return Number.isFinite(num) && num > 0 ? num : item.price;
  }

  function effectiveLots(item: BuyPlanItem): number {
    const raw = lotsOverride[item.ticker]?.trim();
    if (!raw) return item.lots;
    const num = parseInt(raw, 10);
    return Number.isFinite(num) && num > 0 ? num : item.lots;
  }

  function handleConfirm() {
    const selected = items
      .filter((i) => checked[i.ticker])
      .map((i) => {
        const price = effectivePrice(i);
        const lots = effectiveLots(i);
        const payload: { ticker: string; lots: number; price?: number } = { ticker: i.ticker, lots };
        if (price !== i.price) payload.price = price;
        return payload;
      });
    if (selected.length > 0) onConfirm(selected);
  }

  const selectedItems = items.filter((i) => checked[i.ticker]);
  const totalCost = selectedItems.reduce(
    (sum, i) => sum + effectivePrice(i) * effectiveLots(i),
    0
  );
  const allChecked = items.every((i) => checked[i.ticker]);

  if (confirmed) {
    return (
      <div className="rounded-xl border border-plutus-positive/30 bg-plutus-positive/10 p-6 text-center">
        <p className="text-2xl mb-2">✓</p>
        <p className="font-semibold text-plutus-positive">Purchase Confirmed</p>
        <p className="text-sm text-plutus-text-secondary mt-1">
          Your holdings have been updated. Check the Dashboard for the latest portfolio.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-plutus-border bg-plutus-surface overflow-hidden">
      <div className="border-b border-plutus-border px-5 py-3 flex items-center justify-between">
        <h3 className="font-semibold text-plutus-text-primary">Confirm Purchase</h3>
        <button
          onClick={() => toggleAll(!allChecked)}
          className="text-xs text-plutus-gold hover:underline"
        >
          {allChecked ? "Deselect All" : "Select All"}
        </button>
      </div>
      <div className="divide-y divide-plutus-border/30">
        {items.map((item) => {
          const price = effectivePrice(item);
          const lots = effectiveLots(item);
          const lineCost = price * lots;
          return (
            <label
              key={item.ticker}
              className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-plutus-gold/5 transition-colors"
            >
              <input
                type="checkbox"
                checked={checked[item.ticker] || false}
                onChange={(e) =>
                  setChecked({ ...checked, [item.ticker]: e.target.checked })
                }
                className="h-4 w-4 rounded border-plutus-border accent-plutus-gold"
              />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-plutus-text-primary">{item.stock_name}</span>
                <span className="text-plutus-text-secondary text-xs ml-2">
                  Lots:
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder={String(item.lots)}
                  value={lotsOverride[item.ticker] ?? ""}
                  onChange={(e) => {
                    e.stopPropagation();
                    setLotsOverride((prev) => ({ ...prev, [item.ticker]: e.target.value }));
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="ml-1 w-16 inline-block rounded border border-plutus-border bg-plutus-bg px-2 py-0.5 text-sm font-financial text-right tabular-nums focus:border-plutus-gold focus:outline-none"
                />
                <span className="text-plutus-text-secondary text-xs ml-2">@</span>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder={item.price.toFixed(3)}
                  value={priceOverride[item.ticker] ?? ""}
                  onChange={(e) => {
                    e.stopPropagation();
                    setPriceOverride((prev) => ({ ...prev, [item.ticker]: e.target.value }));
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="ml-1 w-20 inline-block rounded border border-plutus-border bg-plutus-bg px-2 py-0.5 text-sm font-financial text-right tabular-nums focus:border-plutus-gold focus:outline-none"
                />
              </div>
              <span className="font-financial text-sm text-plutus-text-primary shrink-0">
                {formatPrice(lineCost, currencySymbol)}
              </span>
            </label>
          );
        })}
      </div>
      <div className="border-t border-plutus-border px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-plutus-text-secondary">
            {selectedItems.length} of {items.length} selected
          </p>
          <p className="font-financial text-lg font-bold text-plutus-gold">
            {formatCurrency(totalCost, currencySymbol)}
          </p>
        </div>
        <button
          onClick={handleConfirm}
          disabled={loading || selectedItems.length === 0}
          className="rounded-lg bg-plutus-positive px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Confirming..." : "I Bought This"}
        </button>
      </div>
    </div>
  );
}
