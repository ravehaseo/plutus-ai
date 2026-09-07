import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  value: number | null | undefined,
  symbol: string = "RM"
): string {
  if (value == null) return "—";
  return `${symbol} ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Use for per-share/per-lot prices (e.g. 0.875). Shows 3 decimal places. */
export function formatPrice(
  value: number | null | undefined,
  symbol: string = "RM"
): string {
  if (value == null) return "—";
  return `${symbol} ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })}`;
}

export function formatPct(value: number | null | undefined): string {
  if (value == null) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatYield(value: number | null | undefined): string {
  if (value == null) return "—";
  const pct = value < 1 ? value * 100 : value;
  return `${pct.toFixed(2)}%`;
}
