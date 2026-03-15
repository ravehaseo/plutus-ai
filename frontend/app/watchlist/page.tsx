"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type {
  Profile,
  WatchlistItem,
  DiscoverCandidate,
  DiscoverResponse,
} from "@/types";
import { SECTOR_LABELS } from "@/lib/constants";

export default function WatchlistPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addTicker, setAddTicker] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [discovering, setDiscovering] = useState(false);
  const [discovery, setDiscovery] = useState<DiscoverResponse | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addingDiscovered, setAddingDiscovered] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [p, w] = await Promise.all([
        api.profiles.active(),
        api.watchlist.list(),
      ]);
      setProfile(p);
      setItems(w);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!addTicker.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      const item = await api.watchlist.add(addTicker.trim());
      setItems((prev) => [...prev, item]);
      setAddTicker("");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add stock");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      await api.watchlist.remove(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    }
  }

  async function handleDiscover() {
    setDiscovering(true);
    setDiscovery(null);
    setSelected(new Set());
    setError(null);
    try {
      const result = await api.watchlist.discover();
      setDiscovery(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Discovery failed"
      );
    } finally {
      setDiscovering(false);
    }
  }

  function toggleCandidate(ticker: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  }

  function selectAllNew() {
    if (!discovery) return;
    const newTickers = discovery.candidates
      .filter((c) => !c.already_in_watchlist)
      .map((c) => c.ticker);
    setSelected(new Set(newTickers));
  }

  async function handleAddDiscovered() {
    if (selected.size === 0) return;
    setAddingDiscovered(true);
    try {
      const added = await api.watchlist.addDiscovered(Array.from(selected));
      setItems((prev) => [...prev, ...added]);
      setSelected(new Set());
      setDiscovery(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add discovered stocks"
      );
    } finally {
      setAddingDiscovered(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-lg bg-plutus-surface"
          />
        ))}
      </div>
    );
  }

  const sectorGroups = items.reduce<Record<string, WatchlistItem[]>>(
    (acc, item) => {
      const s = item.sector || "other";
      if (!acc[s]) acc[s] = [];
      acc[s].push(item);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-plutus-text-primary">
            Watchlist
          </h2>
          <p className="text-sm text-plutus-text-secondary">
            {items.length} stocks tracked across{" "}
            {Object.keys(sectorGroups).length} sectors
          </p>
        </div>
        <button
          onClick={handleDiscover}
          disabled={discovering}
          className="rounded-lg bg-plutus-gold px-4 py-2 text-sm font-medium text-plutus-bg transition-colors hover:bg-plutus-gold-dim disabled:opacity-50"
        >
          {discovering ? "Discovering..." : "Discover Stocks"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-plutus-negative/30 bg-plutus-negative/10 p-4">
          <p className="text-sm text-plutus-negative">{error}</p>
        </div>
      )}

      {/* Manual Add */}
      <div className="rounded-xl border border-plutus-border bg-plutus-surface p-5">
        <h3 className="mb-3 text-sm font-semibold text-plutus-text-primary">
          Add Stock Manually
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={addTicker}
            onChange={(e) => setAddTicker(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder={`Ticker (e.g. 1155${profile?.ticker_suffix || ".KL"})`}
            className="flex-1 rounded-lg border border-plutus-border bg-plutus-bg px-4 py-2 text-sm text-plutus-text-primary placeholder:text-plutus-text-secondary focus:border-plutus-gold focus:outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !addTicker.trim()}
            className="rounded-lg bg-plutus-gold px-5 py-2 text-sm font-medium text-plutus-bg transition-colors hover:bg-plutus-gold-dim disabled:opacity-50"
          >
            {adding ? "Validating..." : "Add"}
          </button>
        </div>
        {addError && (
          <p className="mt-2 text-xs text-plutus-negative">{addError}</p>
        )}
      </div>

      {/* Discovery Results */}
      {discovering && (
        <div className="rounded-xl border border-plutus-border bg-plutus-surface p-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-plutus-gold border-t-transparent" />
          <p className="mt-4 text-plutus-text-secondary">
            Asking Gemini to discover dividend stocks across the market...
          </p>
        </div>
      )}

      {discovery && (
        <div className="rounded-xl border border-plutus-gold/30 bg-plutus-gold/5 overflow-hidden">
          <div className="border-b border-plutus-gold/20 px-5 py-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-plutus-gold">
                Discovered Stocks
              </h3>
              {discovery.summary && (
                <p className="mt-1 text-xs text-plutus-text-secondary">
                  {discovery.summary}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectAllNew}
                className="rounded-md bg-plutus-surface px-3 py-1.5 text-xs text-plutus-text-secondary hover:text-plutus-text-primary transition-colors"
              >
                Select All New
              </button>
              <button
                onClick={handleAddDiscovered}
                disabled={selected.size === 0 || addingDiscovered}
                className="rounded-md bg-plutus-gold px-4 py-1.5 text-xs font-medium text-plutus-bg disabled:opacity-50"
              >
                {addingDiscovered
                  ? "Adding..."
                  : `Add Selected (${selected.size})`}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-plutus-border text-left text-xs uppercase tracking-wide text-plutus-text-secondary">
                  <th className="px-5 py-2 w-10"></th>
                  <th className="px-5 py-2">Stock</th>
                  <th className="px-5 py-2">Sector</th>
                  <th className="px-5 py-2 text-right">Est. Yield</th>
                  <th className="px-5 py-2">Reasoning</th>
                </tr>
              </thead>
              <tbody>
                {discovery.candidates.map((c) => (
                  <tr
                    key={c.ticker}
                    className={`border-b border-plutus-border/50 transition-colors ${
                      c.already_in_watchlist
                        ? "opacity-50"
                        : "hover:bg-plutus-gold/5"
                    }`}
                  >
                    <td className="px-5 py-2">
                      {c.already_in_watchlist ? (
                        <span className="text-xs text-plutus-text-secondary">
                          Added
                        </span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={selected.has(c.ticker)}
                          onChange={() => toggleCandidate(c.ticker)}
                          className="h-4 w-4 rounded border-plutus-border accent-plutus-gold"
                        />
                      )}
                    </td>
                    <td className="px-5 py-2">
                      <div className="font-medium text-plutus-text-primary">
                        {c.stock_name}
                      </div>
                      <div className="text-xs text-plutus-text-secondary">
                        {c.ticker}
                      </div>
                    </td>
                    <td className="px-5 py-2 text-plutus-text-secondary">
                      {SECTOR_LABELS[c.sector] || c.sector}
                    </td>
                    <td className="px-5 py-2 text-right font-financial text-plutus-gold">
                      {c.dividend_yield != null
                        ? `${c.dividend_yield.toFixed(1)}%`
                        : "—"}
                    </td>
                    <td className="px-5 py-2 text-xs text-plutus-text-secondary max-w-xs">
                      {c.reasoning}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Current Watchlist by Sector */}
      {Object.entries(sectorGroups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([sector, sectorItems]) => (
          <div
            key={sector}
            className="rounded-xl border border-plutus-border bg-plutus-surface overflow-hidden"
          >
            <div className="border-b border-plutus-border px-5 py-3">
              <h3 className="font-semibold text-plutus-text-primary">
                {SECTOR_LABELS[sector] || sector}{" "}
                <span className="text-plutus-text-secondary font-normal">
                  ({sectorItems.length})
                </span>
              </h3>
            </div>
            <div className="divide-y divide-plutus-border/50">
              {sectorItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-plutus-surface-light transition-colors"
                >
                  <div>
                    <p className="font-medium text-plutus-text-primary">
                      {item.stock_name}
                    </p>
                    <p className="text-xs text-plutus-text-secondary">
                      {item.ticker}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="rounded-md px-3 py-1 text-xs text-plutus-negative hover:bg-plutus-negative/10 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

      {items.length === 0 && (
        <div className="rounded-xl border border-plutus-border bg-plutus-surface p-12 text-center">
          <p className="text-plutus-text-secondary">
            No stocks in watchlist. Add manually or use Discover Stocks.
          </p>
        </div>
      )}
    </div>
  );
}
