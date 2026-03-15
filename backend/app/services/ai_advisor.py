"""Gemini-powered buy plan generation for the Allocate My Money feature."""

import json
import logging
import re

from google import genai

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=get_settings().gemini_api_key)
    return _client


def _extract_text(response) -> str:
    """Extract all text from a Gemini response, concatenating parts and skipping thinking blocks."""
    # Concatenate ALL non-thinking text parts
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

    # Fallback to .text property
    try:
        if response.text:
            return response.text.strip()
    except (ValueError, AttributeError):
        pass

    print(f"[Plutus] Could not extract text from response. Candidates: {getattr(response, 'candidates', 'N/A')}")
    return ""


def _parse_json(text: str) -> dict:
    """Extract JSON from text that may have markdown code fences or be truncated."""
    # Try to extract from markdown code block
    json_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if json_match:
        text = json_match.group(1).strip()
    elif text.lstrip().startswith("```"):
        # Truncated: opening ``` but no closing — strip the opening
        text = re.sub(r"^[\s]*```(?:json)?\s*", "", text).strip()

    # Extract from first { to last }
    brace_start = text.find("{")
    brace_end = text.rfind("}")
    if brace_start != -1 and brace_end > brace_start:
        text = text[brace_start:brace_end + 1]

    return json.loads(text)


def _build_system_prompt(profile) -> str:
    sector_lines = ", ".join(
        f"{int(v * 100)}% {k.replace('_', ' ').title()}"
        for k, v in profile.sector_targets.items()
    )

    return f"""You are Plutus, a personal AI dividend investment advisor for the {profile.name} stock market.

You MUST follow these investment rules:
- Target allocation: {sector_lines}
- Only recommend stocks yielding {float(profile.yield_band_min)}%-{float(profile.yield_band_max)}% annually
- Flag any stock trading >{float(profile.war_fear_threshold)}% below its 52-week high as a "Sale Opportunity"
- All purchases must be in whole lots of {profile.lot_size} shares
- Use {profile.currency} ({profile.currency_symbol}) for all amounts

When recommending a buy plan:
1. Compare all watchlist stocks by: dividend yield, cost per lot, dividend per lot per year, and War/Fear discount
2. Prioritize stocks that bring the portfolio closer to the sector targets
3. Maximize dividend income per {profile.currency_symbol} invested
4. Stay within the given budget - never exceed it
5. Assess entry timing for each recommended stock — rate as "strong_buy", "buy", "hold", or "wait"
6. Return ONLY valid JSON, no markdown, no explanation outside the JSON

Your tone: supportive, data-driven, direct."""


def _build_user_prompt(
    profile, holdings: list[dict], market_data: list[dict], amount: float, sector_balance: list[dict]
) -> str:
    holdings_text = "None" if not holdings else json.dumps(
        [{"ticker": h["ticker"], "stock_name": h["stock_name"], "sector": h["sector"],
          "shares": h["shares"], "value": h.get("market_value")} for h in holdings],
        indent=2,
    )

    market_text = json.dumps(
        [{"ticker": m["ticker"], "stock_name": m["stock_name"], "sector": m["sector"],
          "price": m.get("last_close"), "yield": m.get("dividend_yield"),
          "annual_div": m.get("annual_dividend"), "52w_high": m.get("week_52_high"),
          "discount": m.get("war_fear_discount"), "cost_per_lot": m.get("cost_per_lot"),
          "div_per_lot": m.get("dividend_per_lot"), "sale_opportunity": m.get("is_sale_opportunity")}
         for m in market_data],
        indent=2,
    )

    balance_text = json.dumps(
        [{"sector": s["sector"], "actual": s["actual_pct"], "target": s["target_pct"],
          "diff": s["diff_pct"]} for s in sector_balance],
        indent=2,
    )

    return f"""I have {profile.currency_symbol} {amount:,.2f} to invest this month.

My current holdings:
{holdings_text}

Current sector balance vs targets:
{balance_text}

Available stocks (watchlist with LATEST market prices as of right now):
{market_text}

Generate a buy plan that allocates my {profile.currency_symbol} {amount:,.2f} across these stocks.
Each purchase must be in whole lots of {profile.lot_size} shares.
Prioritize bringing my sector allocation closer to targets while maximizing dividend yield.
Any unallocated remainder goes to my War Chest.

Respond with ONLY this JSON structure:
{{
  "items": [
    {{
      "ticker": "1155.KL",
      "stock_name": "Maybank",
      "sector": "bank",
      "lots": 2,
      "price": 9.50,
      "cost": 1900.00,
      "dividend_yield": 0.062,
      "dividend_per_lot": 58.90,
      "reasoning": "One sentence explaining why",
      "entry_signal": "strong_buy",
      "entry_reasoning": "Trading 12% below 52-week high with stable 6.2% yield"
    }}
  ],
  "remainder": 100.00,
  "summary": "One paragraph overall reasoning"
}}

Entry signal must be one of: "strong_buy", "buy", "hold", "wait".
- strong_buy: Trading significantly below fair value, excellent entry point
- buy: Good value at current price, reasonable entry
- hold: Fair value, not urgent to buy
- wait: Overvalued or better entry likely soon"""


async def generate_buy_plan(
    profile,
    holdings: list[dict],
    market_data: list[dict],
    amount: float,
    sector_balance: list[dict],
) -> dict:
    """Call Gemini to generate a structured buy plan."""
    api_key = get_settings().gemini_api_key
    print(f"[Plutus] generate_buy_plan called. API key present: {bool(api_key)}, key starts: {api_key[:8] if api_key else '(none)'}")
    if not api_key or api_key == "your-gemini-api-key":
        print("[Plutus] Falling back — no valid API key")
        return _generate_fallback_plan(profile, market_data, amount)

    client = _get_client()
    system_prompt = _build_system_prompt(profile)
    user_prompt = _build_user_prompt(profile, holdings, market_data, amount, sector_balance)

    try:
        from google.genai import types
        response = client.models.generate_content(
            model=get_settings().gemini_model,
            contents=system_prompt + "\n\n" + user_prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=8192,
            ),
        )
        text = _extract_text(response)
        print(f"[Plutus] Buy plan response ({len(text)} chars):")
        print(f"[Plutus] {text[:1000]}")

        if not text:
            print("[Plutus] Empty response from Gemini, using fallback")
            return _generate_fallback_plan(profile, market_data, amount)

        parsed = _parse_json(text)
        return parsed
    except json.JSONDecodeError as e:
        print(f"[Plutus] JSON parse failed: {e}")
        print(f"[Plutus] Raw text was: {text[:500] if text else '(empty)'}")
        return _generate_fallback_plan(profile, market_data, amount)
    except Exception as e:
        print(f"[Plutus] Gemini API error: {e}")
        return _generate_fallback_plan(profile, market_data, amount)


def _derive_entry_signal(stock: dict) -> tuple[str, str]:
    """Derive an entry signal from war/fear data when Gemini is unavailable."""
    discount = stock.get("war_fear_discount") or 0
    if discount >= 15:
        return "strong_buy", f"Trading {discount:.1f}% below 52-week high"
    elif discount >= 10:
        return "buy", f"Moderate discount of {discount:.1f}% below 52-week high"
    elif discount >= 5:
        return "hold", f"Minor discount of {discount:.1f}% below 52-week high"
    else:
        return "wait", f"Near 52-week high, only {discount:.1f}% below"


def _generate_fallback_plan(profile, market_data: list[dict], amount: float) -> dict:
    """Rule-based fallback when Gemini is unavailable. Picks top-yield stocks within budget."""
    lot_size = profile.lot_size
    ranked = sorted(
        [m for m in market_data if m.get("last_close") and m.get("dividend_yield")],
        key=lambda m: m.get("dividend_yield") or 0,
        reverse=True,
    )

    items = []
    remaining = amount
    for stock in ranked:
        cost_per_lot = (stock.get("last_close") or 0) * lot_size
        if cost_per_lot <= 0 or cost_per_lot > remaining:
            continue

        lots = int(remaining // cost_per_lot)
        if lots < 1:
            continue

        cost = lots * cost_per_lot
        signal, signal_reason = _derive_entry_signal(stock)
        items.append({
            "ticker": stock["ticker"],
            "stock_name": stock.get("stock_name", ""),
            "sector": stock.get("sector", ""),
            "lots": lots,
            "price": stock.get("last_close"),
            "cost": round(cost, 2),
            "dividend_yield": stock.get("dividend_yield"),
            "dividend_per_lot": stock.get("dividend_per_lot"),
            "reasoning": "Highest yield available (fallback mode - no Gemini API key)",
            "entry_signal": signal,
            "entry_reasoning": signal_reason,
        })
        remaining -= cost

        if remaining < min((m.get("last_close") or 9999) * lot_size for m in ranked):
            break

    return {
        "items": items,
        "remainder": round(remaining, 2),
        "summary": "Generated using rule-based fallback (Gemini API key not configured). Stocks ranked by dividend yield.",
        "is_fallback": True,
    }
