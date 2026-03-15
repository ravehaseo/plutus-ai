import csv
import io
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.holding import Holding
from app.models.profile import Profile
from app.schemas.portfolio import HoldingCreate, HoldingUpdate, HoldingOut, PortfolioSummary
from app.services.portfolio_service import get_holdings_with_market_data, get_portfolio_summary

router = APIRouter()


async def _active_profile(db: AsyncSession) -> Profile:
    result = await db.execute(select(Profile).where(Profile.is_active == True))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "No active profile")
    return profile


@router.get("", response_model=list[HoldingOut])
async def list_holdings(db: AsyncSession = Depends(get_db)):
    profile = await _active_profile(db)
    return await get_holdings_with_market_data(db, str(profile.id))


@router.get("/summary", response_model=PortfolioSummary)
async def portfolio_summary(db: AsyncSession = Depends(get_db)):
    profile = await _active_profile(db)
    return await get_portfolio_summary(db, str(profile.id))


@router.post("", response_model=HoldingOut)
async def add_holding(data: HoldingCreate, db: AsyncSession = Depends(get_db)):
    profile = await _active_profile(db)

    existing = await db.execute(
        select(Holding).where(
            Holding.profile_id == profile.id,
            Holding.ticker == data.ticker,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, f"Holding {data.ticker} already exists. Use PUT to update.")

    holding = Holding(
        id=uuid.uuid4(),
        profile_id=profile.id,
        ticker=data.ticker,
        stock_name=data.stock_name,
        sector=data.sector,
        shares=data.shares,
        avg_buy_price=data.avg_buy_price,
    )
    db.add(holding)
    await db.commit()
    await db.refresh(holding)

    return HoldingOut(
        id=holding.id,
        ticker=holding.ticker,
        stock_name=holding.stock_name,
        sector=holding.sector,
        shares=holding.shares,
        avg_buy_price=float(holding.avg_buy_price) if holding.avg_buy_price else None,
    )


@router.put("/{holding_id}", response_model=HoldingOut)
async def update_holding(
    holding_id: uuid.UUID, data: HoldingUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Holding).where(Holding.id == holding_id))
    holding = result.scalar_one_or_none()
    if not holding:
        raise HTTPException(404, "Holding not found")

    if data.shares is not None:
        holding.shares = data.shares
    if data.avg_buy_price is not None:
        holding.avg_buy_price = data.avg_buy_price

    await db.commit()
    await db.refresh(holding)

    return HoldingOut(
        id=holding.id,
        ticker=holding.ticker,
        stock_name=holding.stock_name,
        sector=holding.sector,
        shares=holding.shares,
        avg_buy_price=float(holding.avg_buy_price) if holding.avg_buy_price else None,
    )


@router.delete("/{holding_id}")
async def delete_holding(holding_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Holding).where(Holding.id == holding_id))
    holding = result.scalar_one_or_none()
    if not holding:
        raise HTTPException(404, "Holding not found")

    await db.delete(holding)
    await db.commit()
    return {"ok": True}


@router.post("/import")
async def import_csv(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """Import holdings from CSV. Expected columns: ticker, stock_name, sector, shares, avg_buy_price"""
    profile = await _active_profile(db)
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8")))

    imported = 0
    for row in reader:
        ticker = row.get("ticker", "").strip()
        if not ticker:
            continue

        existing = await db.execute(
            select(Holding).where(Holding.profile_id == profile.id, Holding.ticker == ticker)
        )
        if existing.scalar_one_or_none():
            continue

        db.add(Holding(
            id=uuid.uuid4(),
            profile_id=profile.id,
            ticker=ticker,
            stock_name=row.get("stock_name", ticker),
            sector=row.get("sector", "unknown"),
            shares=int(row.get("shares", 0)),
            avg_buy_price=float(row["avg_buy_price"]) if row.get("avg_buy_price") else None,
        ))
        imported += 1

    await db.commit()
    return {"imported": imported}
