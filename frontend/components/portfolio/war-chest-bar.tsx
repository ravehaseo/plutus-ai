"use client";

import { formatCurrency } from "@/lib/utils";

interface WarChestBarProps {
  balance: number;
  target: number;
  currencySymbol: string;
}

export function WarChestBar({ balance, target, currencySymbol }: WarChestBarProps) {
  const pct = target > 0 ? Math.min((balance / target) * 100, 100) : 0;
  const overTarget = balance > target * 1.15;

  return (
    <div className="rounded-xl border border-plutus-border bg-plutus-surface p-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-plutus-text-primary">
          War Chest
        </h3>
        {overTarget && (
          <span className="rounded-full bg-plutus-sale/20 px-2 py-0.5 text-xs text-plutus-sale">
            Over-allocated
          </span>
        )}
      </div>

      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-financial text-xl font-bold text-plutus-text-primary">
          {formatCurrency(balance, currencySymbol)}
        </span>
        <span className="text-xs text-plutus-text-secondary">
          Target: {formatCurrency(target, currencySymbol)}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-plutus-bg">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: overTarget ? "#F59E0B" : "#FFD700",
          }}
        />
      </div>
    </div>
  );
}
