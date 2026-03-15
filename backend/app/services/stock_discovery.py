"""Gemini-powered stock discovery and yfinance validation."""

import asyncio
import json
import logging
import re
import uuid

import yfinance as yf
from google import genai
from google.genai import types
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.watchlist import WatchlistItem

logger = logging.getLogger(__name__)

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=get_settings().gemini_api_key)
    return _client


def _extract_text(response) -> str:
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
    return ""


def _parse_json(text: str):
    json_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if json_match:
        text = json_match.group(1).strip()
    elif text.lstrip().startswith("```"):
        text = re.sub(r"^[\s]*```(?:json)?\s*", "", text).strip()

    brace_start = text.find("{")
    brace_end = text.rfind("}")
    if brace_start != -1 and brace_end > brace_start:
        text = text[brace_start : brace_end + 1]

    return json.loads(text)


def _validate_ticker_sync(ticker: str) -> dict | None:
    """Validate a ticker via yfinance. Returns basic info or None if invalid."""
    try:
        t = yf.Ticker(ticker)
        info = t.info or {}
        price = info.get("regularMarketPrice") or info.get("currentPrice") or info.get("previousClose")
        if not price:
            return None
        div_yield = info.get("dividendYield")
        return {
            "ticker": ticker,
            "stock_name": info.get("shortName") or info.get("longName") or ticker,
            "last_close": price,
            "dividend_yield": div_yield,
            "annual_dividend": info.get("dividendRate"),
            "sector": info.get("sector", "").lower().replace(" ", "_"),
        }
    except Exception as e:
        logger.warning(f"Validation failed for {ticker}: {e}")
        return None


async def validate_ticker(ticker: str) -> dict | None:
    return await asyncio.to_thread(_validate_ticker_sync, ticker)


async def discover_stocks(
    db: AsyncSession,
    profile,
) -> dict:
    """Ask Gemini to discover non-Shariah dividend stocks for the user's market."""
    api_key = get_settings().gemini_api_key
    if not api_key or api_key == "your-gemini-api-key":
        raise ValueError("Gemini API key not configured")

    existing_result = await db.execute(
        select(WatchlistItem.ticker).where(
            WatchlistItem.profile_id == profile.id,
            WatchlistItem.is_active == True,
        )
    )
    existing_tickers = set(existing_result.scalars().all())

    sector_info = ", ".join(
        f"{k.replace('_', ' ').title()} ({int(v * 100)}%)"
        for k, v in profile.sector_targets.items()
        if k != "cash"
    )

    prompt = f"""You are a Malaysian stock market expert specializing in dividend investing on Bursa Malaysia.

I need you to discover high-quality non-Shariah dividend stocks listed on Bursa Malaysia.

My investment profile:
- Target dividend yield range: {float(profile.yield_band_min)}% to {float(profile.yield_band_max)}%
- Current sector targets: {sector_info}
- Currency: {profile.currency} ({profile.currency_symbol})
- Lot size: {profile.lot_size} shares

I already track these tickers: {', '.join(sorted(existing_tickers)) if existing_tickers else 'none'}

Discover 10-15 additional non-Shariah stocks across ANY sector (banks, REITs, sin stocks, utilities, telecoms, consumer, infrastructure, etc.) that:
1. Pay consistent dividends (yield > {float(profile.yield_band_min)}% preferred)
2. Are NOT Shariah-compliant
3. Are liquid and actively traded on Bursa Malaysia
4. Have stable or growing dividend history

For each stock, provide the Bursa ticker in the format "XXXX{profile.ticker_suffix}" (e.g., "1155{profile.ticker_suffix}" for Maybank).

Respond with ONLY this JSON:
{{
  "candidates": [
    {{
      "ticker": "1155{profile.ticker_suffix}",
      "stock_name": "Example Corp",
      "sector": "bank",
      "expected_yield": 5.5,
      "reasoning": "Brief reason why this is a good dividend pick"
    }}
  ],
  "summary": "Brief overall summary of the discovery results"
}}

Use lowercase sector names with underscores (e.g., bank, reit, sin_stock, utility, telecom, consumer, infrastructure, plantation, gaming)."""

    client = _get_client()
    try:
        response = client.models.generate_content(
            model=get_settings().gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.4,
                max_output_tokens=8192,
            ),
        )
        text = _extract_text(response)
        print(f"[Plutus] Discovery response ({len(text)} chars)")

        if not text:
            raise ValueError("Empty response from Gemini")

        parsed = _parse_json(text)
        candidates = parsed.get("candidates", [])

        for c in candidates:
            c["already_in_watchlist"] = c.get("ticker", "") in existing_tickers
            c["dividend_yield"] = c.pop("expected_yield", None)

        return {
            "candidates": candidates,
            "summary": parsed.get("summary", ""),
        }

    except Exception as e:
        print(f"[Plutus] Discovery error: {e}")
        raise


async def validate_and_add_ticker(
    db: AsyncSession,
    profile_id,
    ticker: str,
    stock_name_hint: str | None = None,
    sector_hint: str | None = None,
) -> WatchlistItem | None:
    """Validate a ticker via yfinance and add to the watchlist."""
    info = await validate_ticker(ticker)
    if not info:
        return None

    name = stock_name_hint or info["stock_name"]
    sector = sector_hint or info.get("sector") or "other"

    existing = await db.execute(
        select(WatchlistItem).where(
            WatchlistItem.profile_id == profile_id,
            WatchlistItem.ticker == ticker,
        )
    )
    row = existing.scalar_one_or_none()

    if row:
        row.is_active = True
        row.stock_name = name
        row.sector = sector
    else:
        row = WatchlistItem(
            id=uuid.uuid4(),
            profile_id=profile_id,
            ticker=ticker,
            stock_name=name,
            sector=sector,
        )
        db.add(row)

    await db.commit()
    await db.refresh(row)
    return row
