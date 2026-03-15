"""Seed the database with the default Bursa Malaysia profile and watchlist."""

import asyncio
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.core.constants import DEFAULT_BURSA_PROFILE, BURSA_WATCHLIST
from app.models.profile import Profile
from app.models.watchlist import WatchlistItem


async def seed():
    engine = create_async_engine(get_settings().database_url)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        existing = await session.execute(select(Profile).limit(1))
        if existing.scalar_one_or_none():
            print("Database already seeded — skipping.")
            return

        profile_id = uuid.uuid4()
        profile = Profile(
            id=profile_id,
            name=DEFAULT_BURSA_PROFILE["name"],
            currency=DEFAULT_BURSA_PROFILE["currency"],
            currency_symbol=DEFAULT_BURSA_PROFILE["currency_symbol"],
            ticker_suffix=DEFAULT_BURSA_PROFILE["ticker_suffix"],
            lot_size=DEFAULT_BURSA_PROFILE["lot_size"],
            yield_band_min=DEFAULT_BURSA_PROFILE["yield_band_min"],
            yield_band_max=DEFAULT_BURSA_PROFILE["yield_band_max"],
            war_fear_threshold=DEFAULT_BURSA_PROFILE["war_fear_threshold"],
            sector_targets=DEFAULT_BURSA_PROFILE["sector_targets"],
            news_grounding_query=DEFAULT_BURSA_PROFILE["news_grounding_query"],
            rss_feeds=DEFAULT_BURSA_PROFILE["rss_feeds"],
            monthly_topup_default=DEFAULT_BURSA_PROFILE["monthly_topup_default"],
            income_goal=DEFAULT_BURSA_PROFILE["income_goal"],
            war_chest_balance=DEFAULT_BURSA_PROFILE["war_chest_balance"],
            war_chest_target=DEFAULT_BURSA_PROFILE["war_chest_target"],
            is_active=True,
        )
        session.add(profile)

        for item in BURSA_WATCHLIST:
            session.add(WatchlistItem(
                id=uuid.uuid4(),
                profile_id=profile_id,
                ticker=item["ticker"],
                stock_name=item["stock_name"],
                sector=item["sector"],
            ))

        await session.commit()
        print(f"Seeded profile '{profile.name}' with {len(BURSA_WATCHLIST)} watchlist stocks.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
