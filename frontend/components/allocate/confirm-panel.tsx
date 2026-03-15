"use client";

import { useState } from "react";
import type { BuyPlanItem } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { SECTOR_LABELS } from "@/lib/constants";

interface ConfirmPanelProps {
  items: BuyPlanItem[];
  currencySymbol: string;
  onConfirm: (confirmedItems: { ticker: string; lots: number }[]) => void;
  loading: boolean;
  confirmed: boolean;
}

export function ConfirmPanel({ items, currencySymbol, onConfirm, loading, confirmed }: ConfirmPanelProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map((i) => [i.ticker, true]))
  );

  function toggleAll(val: boolean) {
    setChecked(Object.fromEntries(items.map((i) => [i.ticker, val])));
  }

  function handleConfirm() {
    const selected = items
      .filter((i) => checked[i.ticker])
      .map((i) => ({ ticker: i.ticker, lots: i.lots }));
    if (selected.length > 0) onConfirm(selected);
  }

  const selectedItems = items.filter((i) => checked[i.ticker]);
  const totalCost = selectedItems.reduce((sum, i) => sum + i.cost, 0);
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
        {items.map((item) => (
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
            <div className="flex-1">
              <span className="font-medium text-plutus-text-primary">{item.stock_name}</span>
              <span className="text-plutus-text-secondary text-xs ml-2">
                {item.lots} lots @ {formatCurrency(item.price, currencySymbol)}
              </span>
            </div>
            <span className="font-financial text-sm text-plutus-text-primary">
              {formatCurrency(item.cost, currencySymbol)}
            </span>
          </label>
        ))}
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
