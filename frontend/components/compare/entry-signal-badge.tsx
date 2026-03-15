"use client";

import { ENTRY_SIGNAL_CONFIG } from "@/lib/constants";

interface EntrySignalBadgeProps {
  signal: string | null;
  reasoning?: string | null;
}

export function EntrySignalBadge({ signal, reasoning }: EntrySignalBadgeProps) {
  if (!signal) return <span className="text-xs text-plutus-text-secondary">—</span>;

  const config = ENTRY_SIGNAL_CONFIG[signal];
  if (!config) return <span className="text-xs text-plutus-text-secondary">{signal}</span>;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color} ${config.bg}`}
      title={reasoning || undefined}
    >
      {config.label}
    </span>
  );
}
