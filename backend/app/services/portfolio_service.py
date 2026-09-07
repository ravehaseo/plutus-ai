"""Portfolio analysis: summary stats, sector balance, weighted yield."""

from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.logic.calculations import (
    projected_annual_dividend,
    projected_monthly_income,
    years_to_income_goal,
    generate_multi_scenario_projection,
)
from app.models.holding import Holding
from app.models.market_cache import MarketCache
from app.models.profile import Profile
from app.schemas.portfolio import HoldingOut, PortfolioSummary, SectorAllocation, ScenarioProjection, ProjectionRow


async def get_holdings_with_market_data(
    db: AsyncSession, profile_id: str
) -> list[HoldingOut]:
    # Fetch profile so health rules can respect its yield band.
    profile_result = await db.execute(select(Profile).where(Profile.id == profile_id))
    profile = profile_result.scalar_one()

    result = await db.execute(
        select(Holding).where(Holding.profile_id == profile_id)
    )
    holdings = result.scalars().all()

    tickers = [h.ticker for h in holdings]
    cache_result = await db.execute(
        select(MarketCache).where(MarketCache.ticker.in_(tickers))
    )
    cache_map = {r.ticker: r for r in cache_result.scalars().all()}

    enriched: list[HoldingOut] = []
    # For now we only have cached dividend data; a more advanced version can use a
    # dedicated dividend_history table. We still derive simple health flags here.
    for h in holdings:
        cache = cache_map.get(h.ticker)
        price = float(cache.last_close) if cache and cache.last_close else None
        avg = float(h.avg_buy_price) if h.avg_buy_price else None
        div_yield = float(cache.dividend_yield) if cache and cache.dividend_yield else None
        annual_div = float(cache.annual_dividend) if cache and cache.annual_dividend else None

        market_value = price * h.shares if price else None
        cost_basis = avg * h.shares if avg else None
        pnl = (market_value - cost_basis) if market_value and cost_basis else None
        pnl_pct = (pnl / cost_basis * 100) if pnl and cost_basis else None
        annual_income = annual_div * h.shares if annual_div else None

        health_flags: list[str] = []
        # Phase A rules (profile-aware):
        # 1) Yield much higher than band → possible yield trap.
        if div_yield is not None:
            upper = float(profile.yield_band_max) + 0.03
            lower = float(profile.yield_band_min) - 0.01
            if div_yield > upper:
                health_flags.append("yield_above_band")
            elif div_yield < lower:
                health_flags.append("yield_below_band")

        enriched.append(HoldingOut(
            id=h.id,
            ticker=h.ticker,
            stock_name=h.stock_name,
            sector=h.sector,
            shares=h.shares,
            avg_buy_price=avg,
            current_price=price,
            market_value=round(market_value, 2) if market_value else None,
            pnl=round(pnl, 2) if pnl else None,
            pnl_pct=round(pnl_pct, 2) if pnl_pct else None,
            dividend_yield=div_yield,
            annual_dividend_income=round(annual_income, 2) if annual_income else None,
            health_flags=health_flags,
        ))

    return enriched


async def get_portfolio_summary(
    db: AsyncSession, profile_id: str
) -> PortfolioSummary:
    profile_result = await db.execute(select(Profile).where(Profile.id == profile_id))
    profile = profile_result.scalar_one()

    holdings = await get_holdings_with_market_data(db, profile_id)

    total_value = sum(h.market_value or 0 for h in holdings)
    total_cost = sum(
        (float(h.avg_buy_price) * h.shares) if h.avg_buy_price else 0
        for h in holdings
    )
    total_pnl = total_value - total_cost
    total_pnl_pct = (total_pnl / total_cost * 100) if total_cost > 0 else 0

    total_annual_div = sum(h.annual_dividend_income or 0 for h in holdings)
    weighted_yield = (total_annual_div / total_value) if total_value > 0 else 0

    monthly = projected_monthly_income(total_annual_div)

    ytg = years_to_income_goal(
        total_value,
        float(profile.monthly_topup_default),
        weighted_yield,
        float(profile.income_goal),
    )

    # Sector allocation
    sector_values: dict[str, float] = {}
    for h in holdings:
        sector_values[h.sector] = sector_values.get(h.sector, 0) + (h.market_value or 0)

    sector_targets = profile.sector_targets or {}
    all_sectors = set(list(sector_targets.keys()) + list(sector_values.keys()))

    allocations = []
    for sector in sorted(all_sectors):
        actual = sector_values.get(sector, 0)
        actual_pct = (actual / total_value * 100) if total_value > 0 else 0
        target_pct = sector_targets.get(sector, 0) * 100
        allocations.append(SectorAllocation(
            sector=sector,
            actual_pct=round(actual_pct, 1),
            target_pct=round(target_pct, 1),
            diff_pct=round(actual_pct - target_pct, 1),
        ))

    raw_projections = generate_multi_scenario_projection(
        total_value, float(profile.monthly_topup_default), weighted_yield
    )
    projections = [
        ScenarioProjection(
            label=s["label"],
            yield_rate=s["yield_rate"],
            rows=[ProjectionRow(**r) for r in s["rows"]],
        )
        for s in raw_projections
    ]

    return PortfolioSummary(
        total_value=round(total_value, 2),
        total_cost=round(total_cost, 2),
        total_pnl=round(total_pnl, 2),
        total_pnl_pct=round(total_pnl_pct, 2),
        weighted_yield=round(weighted_yield, 4),
        annual_dividend=round(total_annual_div, 2),
        monthly_income=round(monthly, 2),
        years_to_goal=ytg,
        war_chest_balance=float(profile.war_chest_balance),
        war_chest_target=float(profile.war_chest_target),
        income_goal=float(profile.income_goal),
        monthly_topup=float(profile.monthly_topup_default),
        sector_allocations=allocations,
        projections=projections,
    )
