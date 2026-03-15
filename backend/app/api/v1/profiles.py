from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.profile import Profile
from app.schemas.profile import ProfileOut

router = APIRouter()


@router.get("", response_model=list[ProfileOut])
async def list_profiles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).order_by(Profile.created_at))
    return result.scalars().all()


@router.get("/active", response_model=ProfileOut)
async def get_active_profile(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).where(Profile.is_active == True))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "No active profile found. Run the seed script first.")
    return profile


@router.post("/{profile_id}/activate", response_model=ProfileOut)
async def activate_profile(profile_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).where(Profile.id == profile_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "Profile not found")

    await db.execute(update(Profile).values(is_active=False))
    profile.is_active = True
    await db.commit()
    await db.refresh(profile)
    return profile
