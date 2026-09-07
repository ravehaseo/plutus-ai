"""AI-powered health check for existing holdings."""

import json

from google import genai
from google.genai import types
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.services.portfolio_service import get_holdings_with_market_data
from app.services.ai_advisor import _extract_text, _parse_json


async def run_health_check(db: AsyncSession, profile_id: str) -> dict:
    """Run a one-shot Gemini health check on current holdings.

    Returns a mapping: {ticker: {"risk_level": "low|medium|high", "summary": str}}
    """
    holdings = await get_holdings_with_market_data(db, profile_id)
    if not holdings:
        return {}

    snapshot = [
        {
            "ticker": h.ticker,
            "stock_name": h.stock_name,
            "sector": h.sector,
            "dividend_yield": h.dividend_yield,
            "annual_dividend_income": h.annual_dividend_income,
            "health_flags": getattr(h, "health_flags", []),
        }
        for h in holdings
    ]

    settings = get_settings()
    if not settings.gemini_api_key or settings.gemini_api_key == "your-gemini-api-key":
        return {}

    client = genai.Client(api_key=settings.gemini_api_key)

    prompt = f"""
You are a conservative dividend risk analyst.

For each holding below, rate its dividend risk level and give ONE short sentence why.
Consider: current yield, any warning flags, and generic sector conditions (no fabricated numbers).

Possible risk_level values: "low", "medium", "high".

Respond with ONLY valid JSON in this shape:
{{
  "holdings": [
    {{"ticker": "XXXX.KL", "risk_level": "low|medium|high", "summary": "one-sentence explanation"}}
  ]
}}

Holdings:
{json.dumps(snapshot, indent=2)}
"""

    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.2,
            max_output_tokens=2048,
        ),
    )
    text = _extract_text(response)
    if not text:
        return {}

    parsed = _parse_json(text)
    results: dict[str, dict] = {}
    for item in parsed.get("holdings", []):
        ticker = item.get("ticker")
        if not ticker:
            continue
        results[ticker] = {
            "risk_level": item.get("risk_level", "low"),
            "summary": item.get("summary", ""),
        }

    return results

