"""Fetch market data from yfinance and cache in Postgres."""

import asyncio
import json
import logging
import re
from datetime import datetime, timedelta

import yfinance as yf
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import MarketDataError
from app.logic.war_fear import calculate_discount, is_sale_opportunity
from app.models.market_cache import MarketCache
from app.models.watchlist import WatchlistItem
from app.models.profile import Profile

logger = logging.getLogger(__name__)


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


def _fetch_ticker_sync(ticker: str) -> dict:
    """Synchronous yfinance call — meant to be run via asyncio.to_thread."""
    try:
        t = yf.Ticker(ticker)
        info = t.info or {}

        return {
            "ticker": ticker,
            "stock_name": info.get("shortName") or info.get("longName") or ticker,
            "last_close": info.get("regularMarketPrice") or info.get("currentPrice") or info.get("previousClose"),
            "week_52_high": info.get("fiftyTwoWeekHigh"),
            "week_52_low": info.get("fiftyTwoWeekLow"),
            "dividend_yield": info.get("dividendYield"),
            "annual_dividend": info.get("dividendRate"),
            "pe_ratio": info.get("trailingPE"),
            "market_cap": info.get("marketCap"),
        }
    except Exception as e:
        logger.warning(f"Failed to fetch {ticker}: {e}")
        return {"ticker": ticker, "error": str(e)}


async def fetch_ticker_data(ticker: str) -> dict:
    return await asyncio.to_thread(_fetch_ticker_sync, ticker)


async def _generate_entry_signals(stocks_summary: list[dict], profile) -> dict[str, dict]:
    """Ask Gemini to rate entry timing for a batch of stocks. Returns {ticker: {signal, reasoning}}."""
    api_key = get_settings().gemini_api_key
    if not api_key or api_key == "your-gemini-api-key":
        return {}

    stocks_text = json.dumps(
        [
            {
                "ticker": s["ticker"],
                "name": s.get("stock_name", ""),
                "price": s.get("last_close"),
                "52w_high": s.get("week_52_high"),
                "52w_low": s.get("week_52_low"),
                "discount_pct": s.get("war_fear_discount"),
                "dividend_yield": s.get("dividend_yield"),
                "pe_ratio": s.get("pe_ratio"),
            }
            for s in stocks_summary
        ],
        indent=2,
    )

    prompt = f"""You are an expert stock market analyst for {profile.name}.

Analyze the entry timing for each stock below. Consider:
- Current price vs 52-week high/low range
- War/Fear discount percentage (how far below 52-week high)
- Dividend yield attractiveness
- P/E ratio reasonableness
- General market sentiment

For each stock, provide an entry signal and brief reasoning.

Stocks:
{stocks_text}

Respond with ONLY this JSON:
{{
  "signals": {{
    "TICKER": {{
      "signal": "strong_buy|buy|hold|wait",
      "reasoning": "One sentence explanation"
    }}
  }}
}}

Signal definitions:
- strong_buy: Trading significantly below fair value, excellent entry point
- buy: Good value at current price, reasonable entry
- hold: Fair value, not urgent to buy
- wait: Overvalued or better entry likely soon"""

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=get_settings().gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=4096,
            ),
        )
        text = _extract_text(response)
        if not text:
            return {}

        parsed = _parse_json(text)
        return parsed.get("signals", {})
    except Exception as e:
        print(f"[Plutus] Entry signal generation failed: {e}")
        return {}


async def refresh_watchlist_cache(
    db: AsyncSession,
    profile_id: str,
) -> list[dict]:
    """Fetch fresh market data for all active watchlist tickers and update cache."""
    profile_result = await db.execute(select(Profile).where(Profile.id == profile_id))
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise MarketDataError(f"Profile {profile_id} not found")

    watchlist_result = await db.execute(
        select(WatchlistItem)
        .where(WatchlistItem.profile_id == profile_id, WatchlistItem.is_active == True)
    )
    watchlist = watchlist_result.scalars().all()
    if not watchlist:
        return []

    tickers = [w.ticker for w in watchlist]
    sector_map = {w.ticker: w.sector for w in watchlist}

    tasks = [fetch_ticker_data(t) for t in tickers]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    valid_results = [r for r in results if not isinstance(r, Exception) and "error" not in r]

    entry_signals = await _generate_entry_signals(valid_results, profile)

    cached = []
    for result in valid_results:
        ticker = result["ticker"]
        price = result.get("last_close") or 0
        high_52 = result.get("week_52_high") or 0
        annual_div = result.get("annual_dividend") or 0

        discount = calculate_discount(price, high_52)
        sale = is_sale_opportunity(discount, float(profile.war_fear_threshold))

        signal_data = entry_signals.get(ticker, {})

        row = MarketCache(
            ticker=ticker,
            stock_name=result.get("stock_name"),
            last_close=price,
            week_52_high=high_52,
            week_52_low=result.get("week_52_low"),
            dividend_yield=result.get("dividend_yield"),
            annual_dividend=annual_div,
            pe_ratio=result.get("pe_ratio"),
            market_cap=result.get("market_cap"),
            cost_per_lot=round(price * profile.lot_size, 2),
            dividend_per_lot=round(annual_div * profile.lot_size, 2) if annual_div else 0,
            war_fear_discount=round(discount, 4),
            is_sale_opportunity=sale,
            entry_signal=signal_data.get("signal"),
            entry_reasoning=signal_data.get("reasoning"),
            fetched_at=datetime.utcnow(),
        )
        await db.merge(row)
        cached.append({
            **result,
            "sector": sector_map.get(ticker, ""),
            "cost_per_lot": row.cost_per_lot,
            "dividend_per_lot": row.dividend_per_lot,
            "war_fear_discount": row.war_fear_discount,
            "is_sale_opportunity": row.is_sale_opportunity,
            "entry_signal": row.entry_signal,
            "entry_reasoning": row.entry_reasoning,
            "fetched_at": row.fetched_at.isoformat() if row.fetched_at else None,
        })

    await db.commit()
    return cached


async def get_cached_market_data(
    db: AsyncSession,
    profile_id: str,
) -> list[dict]:
    """Return cached market data joined with watchlist sectors. Refresh if stale."""
    settings = get_settings()
    cutoff = datetime.utcnow() - timedelta(minutes=settings.market_cache_ttl_minutes)

    watchlist_result = await db.execute(
        select(WatchlistItem)
        .where(WatchlistItem.profile_id == profile_id, WatchlistItem.is_active == True)
    )
    watchlist = watchlist_result.scalars().all()
    if not watchlist:
        return []

    tickers = [w.ticker for w in watchlist]
    sector_map = {w.ticker: w.sector for w in watchlist}
    name_map = {w.ticker: w.stock_name for w in watchlist}

    cache_result = await db.execute(
        select(MarketCache).where(MarketCache.ticker.in_(tickers))
    )
    cache_rows = {row.ticker: row for row in cache_result.scalars().all()}

    stale = any(
        t not in cache_rows or cache_rows[t].fetched_at < cutoff
        for t in tickers
    )

    if stale:
        return await refresh_watchlist_cache(db, profile_id)

    return [
        {
            "ticker": row.ticker,
            "stock_name": row.stock_name or name_map.get(row.ticker, ""),
            "sector": sector_map.get(row.ticker, ""),
            "last_close": float(row.last_close) if row.last_close else None,
            "week_52_high": float(row.week_52_high) if row.week_52_high else None,
            "week_52_low": float(row.week_52_low) if row.week_52_low else None,
            "dividend_yield": float(row.dividend_yield) if row.dividend_yield else None,
            "annual_dividend": float(row.annual_dividend) if row.annual_dividend else None,
            "pe_ratio": float(row.pe_ratio) if row.pe_ratio else None,
            "market_cap": row.market_cap,
            "cost_per_lot": float(row.cost_per_lot) if row.cost_per_lot else None,
            "dividend_per_lot": float(row.dividend_per_lot) if row.dividend_per_lot else None,
            "war_fear_discount": float(row.war_fear_discount) if row.war_fear_discount else None,
            "is_sale_opportunity": row.is_sale_opportunity,
            "entry_signal": row.entry_signal,
            "entry_reasoning": row.entry_reasoning,
            "fetched_at": row.fetched_at.isoformat() if row.fetched_at else None,
        }
        for row in cache_rows.values()
    ]
