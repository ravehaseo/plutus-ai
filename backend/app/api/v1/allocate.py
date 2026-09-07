"""Allocate My Money: generate AI buy plans, confirm purchases, view history."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.logic.calculations import (
    projected_annual_dividend,
    projected_monthly_income,
    generate_multi_scenario_projection,
)
from app.models.allocation_history import AllocationHistory
from app.models.holding import Holding
from app.models.profile import Profile
from app.schemas.allocate import (
    AllocateRequest,
    AllocateResponse,
    AllocationHistoryOut,
    BuyPlanItem,
    ConfirmRequest,
    ImpactPreview,
    ScenarioProjection,
    ProjectionRow,
)
from app.services.ai_advisor import generate_buy_plan
from app.services.market_fetcher import get_cached_market_data, refresh_watchlist_prices_only
from app.services.portfolio_service import get_portfolio_summary

router = APIRouter()


def _apply_market_prices_to_plan(plan: dict, market_data: list[dict]) -> None:
    """Use yfinance last_close for each ticker; Gemini often returns rounded or stale prices."""
    rows = [
        (str(m["ticker"]).strip(), float(m["last_close"]))
        for m in market_data
        if m.get("last_close") is not None
    ]
    by_upper = {t.upper(): px for t, px in rows}
    for item in plan.get("items") or []:
        t = (item.get("ticker") or "").strip()
        if not t:
            continue
        px = by_upper.get(t.upper())
        if px is not None:
            item["price"] = px


async def _active_profile(db: AsyncSession) -> Profile:
    result = await db.execute(select(Profile).where(Profile.is_active == True))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "No active profile")
    return profile


@router.post("", response_model=AllocateResponse)
async def generate_allocation(req: AllocateRequest, db: AsyncSession = Depends(get_db)):
    profile = await _active_profile(db)
    profile_id = str(profile.id)

    if req.refresh_market:
        market_data = await refresh_watchlist_prices_only(db, profile_id)
    else:
        market_data = await get_cached_market_data(db, profile_id)
    summary = await get_portfolio_summary(db, profile_id)

    holdings_raw = []
    holdings_result = await db.execute(
        select(Holding).where(Holding.profile_id == profile.id)
    )
    for h in holdings_result.scalars().all():
        mv = None
        for m in market_data:
            if m["ticker"] == h.ticker and m.get("last_close"):
                mv = float(m["last_close"]) * h.shares
                break
        holdings_raw.append({
            "ticker": h.ticker,
            "stock_name": h.stock_name,
            "sector": h.sector,
            "shares": h.shares,
            "avg_buy_price": float(h.avg_buy_price) if h.avg_buy_price else None,
            "market_value": mv,
        })

    sector_balance = [sa.model_dump() for sa in summary.sector_allocations]

    plan = await generate_buy_plan(
        profile=profile,
        holdings=holdings_raw,
        market_data=market_data,
        amount=req.amount,
        sector_balance=sector_balance,
    )
    _apply_market_prices_to_plan(plan, market_data)

    items: list[BuyPlanItem] = []
    total_cost = 0.0
    new_annual_div = 0.0
    remaining_budget = float(req.amount)

    # Enforce budget on the server: never exceed the requested amount.
    for item_data in plan.get("items", []):
        raw_lots = int(item_data.get("lots", 0) or 0)
        price = float(item_data.get("price", 0) or 0)
        if raw_lots <= 0 or price <= 0:
            continue

        cost_per_lot = profile.lot_size * price
        if cost_per_lot <= 0:
            continue

        max_affordable_lots = int(remaining_budget // cost_per_lot)
        lots = min(raw_lots, max_affordable_lots)
        if lots <= 0:
            continue

        cost = lots * cost_per_lot
        div_yield = item_data.get("dividend_yield")
        dplt = item_data.get("dividend_per_lot")

        items.append(BuyPlanItem(
            ticker=item_data.get("ticker", ""),
            stock_name=item_data.get("stock_name", ""),
            sector=item_data.get("sector", ""),
            lots=lots,
            price=price,
            cost=round(cost, 2),
            dividend_yield=div_yield,
            dividend_per_lot=dplt,
            reasoning=item_data.get("reasoning", ""),
            entry_signal=item_data.get("entry_signal"),
            entry_reasoning=item_data.get("entry_reasoning"),
        ))
        total_cost += cost
        remaining_budget -= cost
        if dplt:
            new_annual_div += dplt * lots

    remainder = round(float(req.amount) - total_cost, 2)

    ann_div_before = summary.annual_dividend
    ann_div_after = ann_div_before + new_annual_div

    sector_after = _compute_sector_after(summary, items, profile)

    impact = ImpactPreview(
        annual_dividend_before=ann_div_before,
        annual_dividend_after=round(ann_div_after, 2),
        monthly_income_before=summary.monthly_income,
        monthly_income_after=round(projected_monthly_income(ann_div_after), 2),
        sector_balance_before=sector_balance,
        sector_balance_after=sector_after,
    )

    after_total = summary.total_value + total_cost
    after_yield = ann_div_after / after_total if after_total > 0 else summary.weighted_yield

    projections = _build_projections(
        current_value=after_total,
        monthly_topup=float(profile.monthly_topup_default),
        weighted_yield=after_yield,
    )

    alloc = AllocationHistory(
        id=uuid.uuid4(),
        profile_id=profile.id,
        total_amount=req.amount,
        plan={"items": [i.model_dump() for i in items], "remainder": remainder, "summary": plan.get("summary", "")},
        projected_annual_dividend_before=ann_div_before,
        projected_annual_dividend_after=round(ann_div_after, 2),
        executed=False,
    )
    db.add(alloc)
    await db.commit()

    return AllocateResponse(
        id=alloc.id,
        items=items,
        remainder=remainder,
        summary=plan.get("summary", ""),
        impact=impact,
        projections=projections,
        is_fallback=plan.get("is_fallback", False),
    )


@router.post("/{allocation_id}/confirm")
async def confirm_allocation(
    allocation_id: uuid.UUID,
    req: ConfirmRequest,
    db: AsyncSession = Depends(get_db),
):
    profile = await _active_profile(db)

    result = await db.execute(
        select(AllocationHistory).where(AllocationHistory.id == allocation_id)
    )
    alloc = result.scalar_one_or_none()
    if not alloc:
        raise HTTPException(404, "Allocation not found")
    if alloc.executed:
        raise HTTPException(400, "Allocation already confirmed")

    plan_items = {i["ticker"]: i for i in (alloc.plan or {}).get("items", [])}
    confirmed = []
    total_spent = 0.0

    for ci in req.confirmed_items:
        plan_item = plan_items.get(ci.ticker)
        if not plan_item:
            raise HTTPException(400, f"Ticker {ci.ticker} not in original plan")

        shares_to_add = ci.lots * profile.lot_size
        price = (ci.price if ci.price is not None else plan_item["price"])
        cost = shares_to_add * price

        existing_result = await db.execute(
            select(Holding).where(
                Holding.profile_id == profile.id,
                Holding.ticker == ci.ticker,
            )
        )
        existing = existing_result.scalar_one_or_none()

        if existing:
            old_shares = existing.shares
            old_avg = float(existing.avg_buy_price) if existing.avg_buy_price else price
            new_shares = old_shares + shares_to_add
            new_avg = (old_shares * old_avg + shares_to_add * price) / new_shares
            existing.shares = new_shares
            existing.avg_buy_price = round(new_avg, 4)
        else:
            db.add(Holding(
                id=uuid.uuid4(),
                profile_id=profile.id,
                ticker=ci.ticker,
                stock_name=plan_item.get("stock_name", ci.ticker),
                sector=plan_item.get("sector", "unknown"),
                shares=shares_to_add,
                avg_buy_price=price,
            ))

        total_spent += cost
        confirmed.append({"ticker": ci.ticker, "lots": ci.lots, "cost": round(cost, 2)})

    profile.war_chest_balance = max(0, float(profile.war_chest_balance) - total_spent)
    alloc.executed = True
    alloc.executed_items = {"confirmed": confirmed, "total_spent": round(total_spent, 2)}

    await db.commit()

    summary = await get_portfolio_summary(db, str(profile.id))
    return {"ok": True, "total_spent": round(total_spent, 2), "summary": summary.model_dump()}


@router.get("/history", response_model=list[AllocationHistoryOut])
async def allocation_history(db: AsyncSession = Depends(get_db)):
    profile = await _active_profile(db)
    result = await db.execute(
        select(AllocationHistory)
        .where(AllocationHistory.profile_id == profile.id)
        .order_by(AllocationHistory.created_at.desc())
    )
    return result.scalars().all()


def _compute_sector_after(summary, items: list[BuyPlanItem], profile) -> list[dict]:
    """Recompute sector allocation percentages after adding new purchases."""
    sector_values: dict[str, float] = {}
    total = summary.total_value

    for sa in summary.sector_allocations:
        sector_values[sa.sector] = sa.actual_pct / 100 * total if total > 0 else 0

    for item in items:
        sector_values[item.sector] = sector_values.get(item.sector, 0) + item.cost
        total += item.cost

    targets = profile.sector_targets or {}
    all_sectors = set(list(targets.keys()) + list(sector_values.keys()))

    result = []
    for sector in sorted(all_sectors):
        actual_val = sector_values.get(sector, 0)
        actual_pct = round(actual_val / total * 100, 1) if total > 0 else 0
        target_pct = round(targets.get(sector, 0) * 100, 1)
        result.append({
            "sector": sector,
            "actual_pct": actual_pct,
            "target_pct": target_pct,
            "diff_pct": round(actual_pct - target_pct, 1),
        })
    return result


def _build_projections(current_value: float, monthly_topup: float, weighted_yield: float) -> list[ScenarioProjection]:
    scenarios = generate_multi_scenario_projection(current_value, monthly_topup, weighted_yield)
    result = []
    for scenario in scenarios:
        rows = [
            ProjectionRow(
                year=r["year"],
                portfolio_value=r["portfolio_value"],
                annual_dividend=r["annual_dividend"],
                monthly_income=r["monthly_income"],
            )
            for r in scenario["rows"]
        ]
        result.append(ScenarioProjection(
            label=scenario["label"],
            yield_rate=scenario["yield_rate"],
            rows=rows,
        ))
    return result
