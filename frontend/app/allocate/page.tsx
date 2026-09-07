"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Profile, AllocateResponse, AllocationHistory } from "@/types";
import { AmountInput } from "@/components/allocate/amount-input";
import { BuyPlanTable } from "@/components/allocate/buy-plan-table";
import { ImpactPreview } from "@/components/allocate/impact-preview";
import { ProjectionTable } from "@/components/allocate/projection-table";
import { ConfirmPanel } from "@/components/allocate/confirm-panel";
import { HistoryList } from "@/components/allocate/history-list";

type Tab = "plan" | "history";

export default function AllocatePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<Tab>("plan");
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [plan, setPlan] = useState<AllocateResponse | null>(null);
  const [history, setHistory] = useState<AllocationHistory[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.profiles.active().then(setProfile).catch(() => {});
    // Restore the most recent unexecuted plan from history (skip fallback plans)
    api.allocate.history().then((h) => {
      setHistory(h);
      const pending = h.find((a) => !a.executed);
      if (pending?.plan) {
        const cached = localStorage.getItem(`plutus_plan_${pending.id}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (!parsed.is_fallback) {
              setPlan(parsed);
            } else {
              localStorage.removeItem(`plutus_plan_${pending.id}`);
            }
          } catch { /* ignore */ }
        }
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "history") {
      api.allocate.history().then(setHistory).catch(() => {});
    }
  }, [tab]);

  async function handleGenerate(amount: number) {
    setGenerating(true);
    setError(null);
    setPlan(null);
    setConfirmed(false);
    try {
      const result = await api.allocate.generate(amount);
      setPlan(result);
      localStorage.setItem(`plutus_plan_${result.id}`, JSON.stringify(result));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate buy plan");
    } finally {
      setGenerating(false);
    }
  }

  async function handleConfirm(confirmedItems: { ticker: string; lots: number; price?: number }[]) {
    if (!plan) return;
    setConfirming(true);
    setError(null);
    try {
      await api.allocate.confirm(plan.id, confirmedItems);
      setConfirmed(true);
      localStorage.removeItem(`plutus_plan_${plan.id}`);
      api.profiles.active().then(setProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm purchase");
    } finally {
      setConfirming(false);
    }
  }

  const sym = profile?.currency_symbol || "RM";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-plutus-text-primary">Allocate My Money</h2>
        <div className="flex gap-1 rounded-lg bg-plutus-surface p-1">
          <button
            onClick={() => setTab("plan")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "plan"
                ? "bg-plutus-gold text-plutus-bg"
                : "text-plutus-text-secondary hover:text-plutus-text-primary"
            }`}
          >
            New Plan
          </button>
          <button
            onClick={() => setTab("history")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "history"
                ? "bg-plutus-gold text-plutus-bg"
                : "text-plutus-text-secondary hover:text-plutus-text-primary"
            }`}
          >
            History
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-plutus-negative/30 bg-plutus-negative/10 p-4">
          <p className="text-sm text-plutus-negative">{error}</p>
        </div>
      )}

      {tab === "plan" && (
        <div className="space-y-6">
<AmountInput
                currencySymbol={sym}
                onGenerate={handleGenerate}
                loading={generating}
                defaultAmount={profile?.war_chest_balance}
              />
          <p className="text-xs text-plutus-text-secondary -mt-2">
            Generate Buy Plan refreshes live prices (yfinance) so plan prices match current quotes.
          </p>

          {generating && (
            <div className="space-y-4">
              <div className="rounded-xl border border-plutus-border bg-plutus-surface p-12 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-plutus-gold border-t-transparent" />
                <p className="mt-4 text-plutus-text-secondary">
                  Analyzing market data and generating your buy plan...
                </p>
              </div>
            </div>
          )}

          {plan && !generating && (
            <>
              {plan.is_fallback && (
                <div className="rounded-xl border border-plutus-sale/30 bg-plutus-sale/10 p-4">
                  <p className="text-sm text-plutus-sale">
                    Running in fallback mode (no Gemini API key). Stocks ranked by dividend yield only.
                    Add your API key to .env for AI-powered recommendations.
                  </p>
                </div>
              )}

              {plan.summary && (
                <div className="rounded-xl border border-plutus-border bg-plutus-surface p-5">
                  <p className="text-xs uppercase tracking-wide text-plutus-text-secondary mb-2">
                    AI Analysis
                  </p>
                  <p className="text-sm text-plutus-text-primary leading-relaxed">{plan.summary}</p>
                </div>
              )}

              <BuyPlanTable
                items={plan.items}
                remainder={plan.remainder}
                currencySymbol={sym}
              />

              <ImpactPreview impact={plan.impact} currencySymbol={sym} />

              <ProjectionTable projections={plan.projections} currencySymbol={sym} />

              <ConfirmPanel
                items={plan.items}
                currencySymbol={sym}
                onConfirm={handleConfirm}
                loading={confirming}
                confirmed={confirmed}
              />
            </>
          )}
        </div>
      )}

      {tab === "history" && (
        <HistoryList history={history} currencySymbol={sym} />
      )}
    </div>
  );
}
