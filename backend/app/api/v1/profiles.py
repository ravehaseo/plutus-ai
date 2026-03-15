import json
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.profile import Profile
from app.schemas.profile import ProfileOut, ProfileUpdate, AISuggestResponse

logger = logging.getLogger(__name__)

router = APIRouter()


async def _active_profile(db: AsyncSession) -> Profile:
    result = await db.execute(select(Profile).where(Profile.is_active == True))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(404, "No active profile")
    return profile


@router.get("", response_model=list[ProfileOut])
async def list_profiles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).order_by(Profile.created_at))
    return result.scalars().all()


@router.get("/active", response_model=ProfileOut)
async def get_active_profile(db: AsyncSession = Depends(get_db)):
    profile = await _active_profile(db)
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


@router.put("/active", response_model=ProfileOut)
async def update_active_profile(data: ProfileUpdate, db: AsyncSession = Depends(get_db)):
    profile = await _active_profile(db)

    if data.sector_targets is not None:
        total = sum(data.sector_targets.values())
        if abs(total - 1.0) > 0.01:
            raise HTTPException(400, f"Sector targets must sum to 100% (got {total * 100:.1f}%)")
        profile.sector_targets = data.sector_targets

    if data.yield_band_min is not None:
        profile.yield_band_min = data.yield_band_min
    if data.yield_band_max is not None:
        profile.yield_band_max = data.yield_band_max
    if data.war_fear_threshold is not None:
        profile.war_fear_threshold = data.war_fear_threshold
    if data.monthly_topup_default is not None:
        profile.monthly_topup_default = data.monthly_topup_default
    if data.income_goal is not None:
        profile.income_goal = data.income_goal
    if data.war_chest_target is not None:
        profile.war_chest_target = data.war_chest_target

    await db.commit()
    await db.refresh(profile)
    return profile


@router.post("/active/suggest-sectors", response_model=AISuggestResponse)
async def suggest_sector_targets(db: AsyncSession = Depends(get_db)):
    """Ask Gemini to recommend sector allocation targets based on market conditions."""
    profile = await _active_profile(db)
    api_key = get_settings().gemini_api_key

    if not api_key or api_key == "your-gemini-api-key":
        raise HTTPException(400, "Gemini API key not configured. Add it to .env to use AI suggestions.")

    from google import genai

    current_sectors = json.dumps(profile.sector_targets, indent=2)
    sector_list = ", ".join(profile.sector_targets.keys())

    prompt = f"""You are a dividend investment strategy advisor for the {profile.name} stock market.

Current sector targets: {current_sectors}

Available sectors: {sector_list}

The investor's goals:
- Monthly income goal: {profile.currency_symbol} {float(profile.income_goal):,.2f}
- Target dividend yield band: {float(profile.yield_band_min)}% - {float(profile.yield_band_max)}%
- Investment style: dividend-focused, long-term wealth building

Based on current {profile.name} market conditions, suggest the optimal sector allocation for maximum dividend income with moderate risk.

Rules:
- All values must be decimals that sum to exactly 1.0
- Use ONLY these sector keys: {sector_list}
- Always keep a "cash" allocation between 5-15%

Respond with ONLY this JSON:
{{
  "suggested_targets": {{"sector_key": 0.XX, ...}},
  "reasoning": "2-3 sentences explaining why"
}}"""

    try:
        client = genai.Client(api_key=api_key)
        from google.genai import types
        response = client.models.generate_content(
            model=get_settings().gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=4096,
            ),
        )

        text = _extract_text(response)
        print(f"[Plutus] Gemini suggest-sectors full response ({len(text)} chars):")
        print(f"[Plutus] {text}")

        if not text:
            raise ValueError("Gemini returned an empty response")

        parsed = _parse_json(text)
        return AISuggestResponse(
            suggested_targets=parsed["suggested_targets"],
            reasoning=parsed.get("reasoning", ""),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Gemini sector suggestion error: {e}", exc_info=True)
        raise HTTPException(500, f"AI suggestion failed: {str(e)}")


def _parse_json(text: str) -> dict:
    """Extract and parse JSON from a Gemini response that may contain markdown."""
    import re

    # Strip markdown code fences (greedy to handle truncated closing)
    json_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if json_match:
        text = json_match.group(1).strip()
    elif text.startswith("```"):
        # Truncated response: closing ``` never arrived — strip the opening
        text = re.sub(r"^```(?:json)?\s*", "", text).strip()

    # Extract from first { to last }
    brace_start = text.find("{")
    brace_end = text.rfind("}")
    if brace_start != -1 and brace_end > brace_start:
        text = text[brace_start:brace_end + 1]
    elif brace_start == -1:
        raise ValueError(f"No JSON object found in response: {text[:200]}")

    return json.loads(text)


def _extract_text(response) -> str:
    """Extract all text from a Gemini response, concatenating parts and skipping thinking blocks."""
    try:
        texts = []
        for candidate in response.candidates:
            for part in candidate.content.parts:
                if hasattr(part, "thought") and part.thought:
                    continue
                if hasattr(part, "text") and part.text:
                    texts.append(part.text)
        if texts:
            return "".join(texts).strip()
    except (AttributeError, IndexError, TypeError):
        pass

    try:
        if response.text:
            return response.text.strip()
    except (ValueError, AttributeError):
        pass

    print(f"[Plutus] Could not extract text. Response type: {type(response)}")
    return ""
