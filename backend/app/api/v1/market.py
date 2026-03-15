from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.profile import Profile
from app.schemas.market import MarketDataOut
from app.services.market_fetcher import get_cached_market_data, refresh_watchlist_cache

router = APIRouter()


async def _active_profile(db: AsyncSession) -> Profile:
    result = await db.execute(select(Profile).where(Profile.is_active == True))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "No active profile")
    return profile


@router.get("/watchlist", response_model=list[MarketDataOut])
async def get_watchlist_market_data(db: AsyncSession = Depends(get_db)):
    profile = await _active_profile(db)
    data = await get_cached_market_data(db, str(profile.id))
    return data


@router.post("/refresh", response_model=list[MarketDataOut])
async def force_refresh(db: AsyncSession = Depends(get_db)):
    profile = await _active_profile(db)
    data = await refresh_watchlist_cache(db, str(profile.id))
    return data
