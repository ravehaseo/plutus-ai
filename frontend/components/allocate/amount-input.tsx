"use client";

import { useState } from "react";

interface AmountInputProps {
  currencySymbol: string;
  onGenerate: (amount: number) => void;
  loading: boolean;
}

export function AmountInput({ currencySymbol, onGenerate, loading }: AmountInputProps) {
  const [amount, setAmount] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(amount);
    if (val > 0) onGenerate(val);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-plutus-border bg-plutus-surface p-6">
      <label className="block text-sm font-medium text-plutus-text-secondary mb-3">
        How much do you want to invest?
      </label>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-plutus-gold">
            {currencySymbol}
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="2,000.00"
            className="w-full rounded-lg border border-plutus-border bg-plutus-bg py-3 pl-14 pr-4 font-financial text-2xl text-plutus-text-primary placeholder:text-plutus-text-secondary/40 focus:border-plutus-gold focus:outline-none focus:ring-1 focus:ring-plutus-gold"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !amount || parseFloat(amount) <= 0}
          className="rounded-lg bg-plutus-gold px-6 py-3.5 font-semibold text-plutus-bg transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Analyzing..." : "Generate Buy Plan"}
        </button>
      </div>
    </form>
  );
}
