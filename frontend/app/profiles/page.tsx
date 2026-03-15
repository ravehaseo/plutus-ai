"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Profile, AISuggestResponse } from "@/types";
import { SECTOR_LABELS, SECTOR_COLORS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

export default function ProfilesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<AISuggestResponse | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [sectors, setSectors] = useState<Record<string, number>>({});
  const [yieldMin, setYieldMin] = useState(5);
  const [yieldMax, setYieldMax] = useState(8);
  const [warFear, setWarFear] = useState(10);
  const [monthlyTopup, setMonthlyTopup] = useState(500);
  const [incomeGoal, setIncomeGoal] = useState(2000);
  const [warChestTarget, setWarChestTarget] = useState(7000);

  useEffect(() => {
    api.profiles.active().then((p) => {
      setProfile(p);
      setSectors({ ...p.sector_targets });
      setYieldMin(p.yield_band_min);
      setYieldMax(p.yield_band_max);
      setWarFear(p.war_fear_threshold);
      setMonthlyTopup(p.monthly_topup_default);
      setIncomeGoal(p.income_goal);
      setWarChestTarget(p.war_chest_target);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function updateSector(key: string, value: number) {
    setSectors((prev) => ({ ...prev, [key]: value }));
  }

  function addSector() {
    const name = prompt("Enter sector key (e.g. tech, energy):");
    if (!name || sectors[name] !== undefined) return;
    setSectors((prev) => ({ ...prev, [name]: 0 }));
  }

  function removeSector(key: string) {
    if (key === "cash") return;
    setSectors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.profiles.update({
        sector_targets: sectors,
        yield_band_min: yieldMin,
        yield_band_max: yieldMax,
        war_fear_threshold: warFear,
        monthly_topup_default: monthlyTopup,
        income_goal: incomeGoal,
        war_chest_target: warChestTarget,
      });
      setProfile(updated);
      setMessage({ type: "success", text: "Settings saved successfully." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  async function handleAISuggest() {
    setSuggesting(true);
    setSuggestion(null);
    setMessage(null);
    try {
      const result = await api.profiles.suggestSectors();
      setSuggestion(result);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "AI suggestion failed" });
    } finally {
      setSuggesting(false);
    }
  }

  function applySuggestion() {
    if (!suggestion) return;
    setSectors({ ...suggestion.suggested_targets });
    setSuggestion(null);
    setMessage({ type: "success", text: "AI suggestion applied. Click Save to confirm." });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-plutus-surface" />
        ))}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-xl border border-plutus-border bg-plutus-surface p-8 text-center">
        <p className="text-plutus-text-secondary">No active profile found.</p>
      </div>
    );
  }

  const sym = profile.currency_symbol;
  const totalPct = Object.values(sectors).reduce((s, v) => s + v, 0);
  const totalValid = Math.abs(totalPct - 1.0) <= 0.01;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-plutus-text-primary">
          Profile Settings — {profile.name}
        </h2>
        <span className="text-xs text-plutus-text-secondary">{profile.currency}</span>
      </div>

      {message && (
        <div className={`rounded-xl border p-4 ${
          message.type === "success"
            ? "border-plutus-positive/30 bg-plutus-positive/10 text-plutus-positive"
            : "border-plutus-negative/30 bg-plutus-negative/10 text-plutus-negative"
        }`}>
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* Sector Targets */}
      <div className="rounded-xl border border-plutus-border bg-plutus-surface p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-plutus-text-primary">Sector Allocation Targets</h3>
          <div className="flex gap-2">
            <button
              onClick={handleAISuggest}
              disabled={suggesting}
              className="rounded-lg bg-plutus-gold/10 border border-plutus-gold/30 px-4 py-1.5 text-sm font-medium text-plutus-gold transition-colors hover:bg-plutus-gold/20 disabled:opacity-40"
            >
              {suggesting ? "Asking AI..." : "AI Suggest"}
            </button>
            <button
              onClick={addSector}
              className="rounded-lg bg-plutus-surface-light px-3 py-1.5 text-sm text-plutus-text-secondary hover:text-plutus-text-primary transition-colors"
            >
              + Add Sector
            </button>
          </div>
        </div>

        {/* Visual bar */}
        <div className="flex h-5 overflow-hidden rounded-full bg-plutus-bg mb-4">
          {Object.entries(sectors)
            .filter(([, v]) => v > 0)
            .map(([key, val]) => (
              <div
                key={key}
                className="h-full transition-all duration-300"
                style={{
                  width: `${val * 100}%`,
                  backgroundColor: SECTOR_COLORS[key] || "#666",
                }}
                title={`${SECTOR_LABELS[key] || key}: ${(val * 100).toFixed(0)}%`}
              />
            ))}
        </div>

        <div className="space-y-3">
          {Object.entries(sectors).map(([key, val]) => (
            <div key={key} className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: SECTOR_COLORS[key] || "#666" }}
              />
              <span className="text-sm text-plutus-text-primary w-32">
                {SECTOR_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(val * 100)}
                onChange={(e) => updateSector(key, Number(e.target.value) / 100)}
                className="flex-1 h-2 rounded-full appearance-none bg-plutus-bg accent-plutus-gold cursor-pointer"
              />
              <span className="font-financial text-sm text-plutus-gold w-12 text-right">
                {(val * 100).toFixed(0)}%
              </span>
              {key !== "cash" && (
                <button
                  onClick={() => removeSector(key)}
                  className="text-xs text-plutus-text-secondary hover:text-plutus-negative transition-colors"
                  title="Remove sector"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className={`mt-3 text-xs font-medium ${totalValid ? "text-plutus-positive" : "text-plutus-negative"}`}>
          Total: {(totalPct * 100).toFixed(0)}%{" "}
          {!totalValid && "(must equal 100%)"}
        </div>
      </div>

      {/* AI Suggestion */}
      {suggestion && (
        <div className="rounded-xl border border-plutus-gold/30 bg-plutus-gold/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-plutus-gold">AI Recommendation</h3>
            <div className="flex gap-2">
              <button
                onClick={applySuggestion}
                className="rounded-lg bg-plutus-gold px-4 py-1.5 text-sm font-semibold text-plutus-bg hover:opacity-90"
              >
                Apply
              </button>
              <button
                onClick={() => setSuggestion(null)}
                className="rounded-lg bg-plutus-surface px-4 py-1.5 text-sm text-plutus-text-secondary hover:text-plutus-text-primary"
              >
                Dismiss
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mb-3">
            {Object.entries(suggestion.suggested_targets).map(([key, val]) => (
              <span key={key} className="rounded-full bg-plutus-surface px-3 py-1 text-xs">
                <span
                  className="inline-block h-2 w-2 rounded-full mr-1.5"
                  style={{ backgroundColor: SECTOR_COLORS[key] || "#666" }}
                />
                <span className="text-plutus-text-primary">
                  {SECTOR_LABELS[key] || key}: {(val * 100).toFixed(0)}%
                </span>
              </span>
            ))}
          </div>
          <p className="text-sm text-plutus-text-secondary">{suggestion.reasoning}</p>
        </div>
      )}

      {/* Investment Parameters */}
      <div className="rounded-xl border border-plutus-border bg-plutus-surface p-6">
        <h3 className="font-semibold text-plutus-text-primary mb-4">Investment Parameters</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs text-plutus-text-secondary mb-1">
              Yield Band Min (%)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="20"
              value={yieldMin}
              onChange={(e) => setYieldMin(Number(e.target.value))}
              className="w-full rounded-lg border border-plutus-border bg-plutus-bg px-3 py-2 font-financial text-plutus-text-primary focus:border-plutus-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-plutus-text-secondary mb-1">
              Yield Band Max (%)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="20"
              value={yieldMax}
              onChange={(e) => setYieldMax(Number(e.target.value))}
              className="w-full rounded-lg border border-plutus-border bg-plutus-bg px-3 py-2 font-financial text-plutus-text-primary focus:border-plutus-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-plutus-text-secondary mb-1">
              War/Fear Threshold (%)
            </label>
            <input
              type="number"
              step="1"
              min="0"
              max="50"
              value={warFear}
              onChange={(e) => setWarFear(Number(e.target.value))}
              className="w-full rounded-lg border border-plutus-border bg-plutus-bg px-3 py-2 font-financial text-plutus-text-primary focus:border-plutus-gold focus:outline-none"
            />
            <p className="text-[10px] text-plutus-text-secondary mt-1">
              Stocks below their 52-week high by this % are flagged as sale opportunities
            </p>
          </div>
          <div>
            <label className="block text-xs text-plutus-text-secondary mb-1">
              Monthly Top-up Default ({sym})
            </label>
            <input
              type="number"
              step="100"
              min="0"
              value={monthlyTopup}
              onChange={(e) => setMonthlyTopup(Number(e.target.value))}
              className="w-full rounded-lg border border-plutus-border bg-plutus-bg px-3 py-2 font-financial text-plutus-text-primary focus:border-plutus-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-plutus-text-secondary mb-1">
              Monthly Income Goal ({sym})
            </label>
            <input
              type="number"
              step="100"
              min="0"
              value={incomeGoal}
              onChange={(e) => setIncomeGoal(Number(e.target.value))}
              className="w-full rounded-lg border border-plutus-border bg-plutus-bg px-3 py-2 font-financial text-plutus-text-primary focus:border-plutus-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-plutus-text-secondary mb-1">
              War Chest Target ({sym})
            </label>
            <input
              type="number"
              step="500"
              min="0"
              value={warChestTarget}
              onChange={(e) => setWarChestTarget(Number(e.target.value))}
              className="w-full rounded-lg border border-plutus-border bg-plutus-bg px-3 py-2 font-financial text-plutus-text-primary focus:border-plutus-gold focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !totalValid}
          className="rounded-lg bg-plutus-gold px-8 py-3 font-semibold text-plutus-bg transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
