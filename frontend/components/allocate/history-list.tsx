"use client";

import type { AllocationHistory } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface HistoryListProps {
  history: AllocationHistory[];
  currencySymbol: string;
}

export function HistoryList({ history, currencySymbol }: HistoryListProps) {
  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-plutus-border bg-plutus-surface p-8 text-center">
        <p className="text-plutus-text-secondary">No allocation history yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((h) => {
        const date = new Date(h.created_at).toLocaleDateString("en-MY", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const itemCount = h.plan?.items?.length || 0;

        return (
          <div
            key={h.id}
            className="rounded-xl border border-plutus-border bg-plutus-surface p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    h.executed ? "bg-plutus-positive" : "bg-plutus-sale"
                  }`}
                />
                <span className="text-sm font-medium text-plutus-text-primary">
                  {formatCurrency(h.total_amount, currencySymbol)}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  h.executed
                    ? "bg-plutus-positive/10 text-plutus-positive"
                    : "bg-plutus-sale/10 text-plutus-sale"
                }`}>
                  {h.executed ? "Executed" : "Pending"}
                </span>
              </div>
              <span className="text-xs text-plutus-text-secondary">{date}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-plutus-text-secondary">
              <span>{itemCount} stock{itemCount !== 1 ? "s" : ""}</span>
              {h.projected_annual_dividend_before != null && h.projected_annual_dividend_after != null && (
                <span>
                  Dividend: {formatCurrency(h.projected_annual_dividend_before, currencySymbol)} →{" "}
                  <span className="text-plutus-positive">
                    {formatCurrency(h.projected_annual_dividend_after, currencySymbol)}
                  </span>
                </span>
              )}
              {h.executed && h.executed_items && (
                <span>Spent: {formatCurrency(h.executed_items.total_spent, currencySymbol)}</span>
              )}
            </div>
            {h.plan?.summary && (
              <p className="mt-2 text-xs text-plutus-text-secondary/80 line-clamp-2">
                {h.plan.summary}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
