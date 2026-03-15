"""Watchlist management: list, add, remove, discover new stocks."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.profile import Profile
from app.models.watchlist import WatchlistItem
from app.schemas.watchlist import (
    WatchlistItemOut,
    WatchlistAddRequest,
    DiscoverResponse,
    DiscoverAddRequest,
)
from app.services.stock_discovery import (
    discover_stocks,
    validate_and_add_ticker,
    validate_ticker,
)

router = APIRouter()


async def _active_profile(db: AsyncSession) -> Profile:
    result = await db.execute(select(Profile).where(Profile.is_active == True))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "No active profile")
    return profile


@router.get("", response_model=list[WatchlistItemOut])
async def list_watchlist(db: AsyncSession = Depends(get_db)):
    profile = await _active_profile(db)
    result = await db.execute(
        select(WatchlistItem)
        .where(WatchlistItem.profile_id == profile.id, WatchlistItem.is_active == True)
        .order_by(WatchlistItem.sector, WatchlistItem.stock_name)
    )
    return result.scalars().all()


@router.post("", response_model=WatchlistItemOut)
async def add_stock(req: WatchlistAddRequest, db: AsyncSession = Depends(get_db)):
    """Manually add a stock by ticker. Validates via yfinance first."""
    profile = await _active_profile(db)

    ticker = req.ticker.strip().upper()
    if not ticker.endswith(profile.ticker_suffix):
        ticker = f"{ticker}{profile.ticker_suffix}"

    existing = await db.execute(
        select(WatchlistItem).where(
            WatchlistItem.profile_id == profile.id,
            WatchlistItem.ticker == ticker,
            WatchlistItem.is_active == True,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, f"{ticker} is already in your watchlist")

    info = await validate_ticker(ticker)
    if not info:
        raise HTTPException(
            422, f"Could not validate {ticker}. Check the ticker is listed on Bursa."
        )

    item = await validate_and_add_ticker(
        db, profile.id, ticker,
        stock_name_hint=info["stock_name"],
        sector_hint=info.get("sector"),
    )
    if not item:
        raise HTTPException(500, "Failed to add stock")

    return item


@router.delete("/{item_id}")
async def remove_stock(item_id: str, db: AsyncSession = Depends(get_db)):
    """Soft-delete a stock from the watchlist."""
    profile = await _active_profile(db)
    result = await db.execute(
        select(WatchlistItem).where(
            WatchlistItem.id == item_id,
            WatchlistItem.profile_id == profile.id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Watchlist item not found")

    item.is_active = False
    await db.commit()
    return {"ok": True, "removed": item.ticker}


@router.post("/discover", response_model=DiscoverResponse)
async def discover(db: AsyncSession = Depends(get_db)):
    """Ask Gemini to discover new dividend stocks."""
    profile = await _active_profile(db)
    try:
        result = await discover_stocks(db, profile)
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Discovery failed: {e}")


@router.post("/discover/add", response_model=list[WatchlistItemOut])
async def add_discovered(req: DiscoverAddRequest, db: AsyncSession = Depends(get_db)):
    """Add selected tickers from discovery results to watchlist."""
    profile = await _active_profile(db)
    added = []

    for ticker in req.tickers:
        ticker = ticker.strip().upper()
        if not ticker.endswith(profile.ticker_suffix):
            ticker = f"{ticker}{profile.ticker_suffix}"

        item = await validate_and_add_ticker(db, profile.id, ticker)
        if item:
            added.append(item)

    if not added:
        raise HTTPException(422, "No valid stocks could be added")

    return added
