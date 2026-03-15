"use client";

export function SaleBadge({ discount }: { discount: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-plutus-sale/20 px-2 py-0.5 text-xs font-medium text-plutus-sale">
      ⚡ {discount.toFixed(1)}% off
    </span>
  );
}
