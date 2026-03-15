"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Profile } from "@/types";

export function Topbar() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [active, setActive] = useState<Profile | null>(null);

  useEffect(() => {
    api.profiles.list().then(setProfiles).catch(console.error);
    api.profiles.active().then(setActive).catch(console.error);
  }, []);

  async function switchProfile(id: string) {
    const updated = await api.profiles.activate(id);
    setActive(updated);
    window.location.reload();
  }

  return (
    <header className="fixed left-56 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-plutus-border bg-plutus-bg px-6">
      <h1 className="text-sm text-plutus-text-secondary">
        Dividend Investment Advisor
      </h1>

      <div className="flex items-center gap-3">
        <select
          value={active?.id || ""}
          onChange={(e) => switchProfile(e.target.value)}
          className="rounded-md border border-plutus-border bg-plutus-surface px-3 py-1.5 text-sm text-plutus-text-primary outline-none focus:border-plutus-gold"
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.currency_symbol})
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
