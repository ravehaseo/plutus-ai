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


def _sanitize_json(text: str) -> str:
    """Fix common LLM JSON mistakes: trailing commas, missing commas, etc."""
    # Remove trailing commas before } or ]
    text = re.sub(r",\s*([}\]])", r"\1", text)
    # Add missing commas between } and { in arrays
    text = re.sub(r"}\s*{", "},{", text)
    # Add missing commas between " and " across object boundaries
    text = re.sub(r'"\s*\n\s*"', '",\n"', text)
    return text


def _close_truncated_json(text: str) -> str:
    """Close any unclosed brackets/braces in truncated JSON."""
    brace_start = text.find("{")
    if brace_start == -1:
        raise json.JSONDecodeError("No JSON object found", text, 0)
    text = text[brace_start:]

    # Find the last structurally complete point
    last_good = -1
    in_string = False
    escape_next = False
    for i, ch in enumerate(text):
        if escape_next:
            escape_next = False
            continue
        if ch == '\\':
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
        if not in_string and ch in (',', '[', '{', '}', ']'):
            last_good = i

    if last_good > 0 and last_good < len(text) - 1:
        text = text[:last_good + 1]

    text = text.rstrip().rstrip(',')

    opens = 0
    open_brackets = 0
    in_string = False
    escape_next = False
    for ch in text:
        if escape_next:
            escape_next = False
            continue
        if ch == '\\':
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
        if not in_string:
            if ch == '{':
                opens += 1
            elif ch == '}':
                opens -= 1
            elif ch == '[':
                open_brackets += 1
            elif ch == ']':
                open_brackets -= 1

    text += ']' * open_brackets + '}' * opens
    return text


def _parse_json(text: str) -> dict:
    """Extract JSON from text, handling markdown fences, LLM quirks, and truncation."""
    json_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if json_match:
        text = json_match.group(1).strip()
    elif text.lstrip().startswith("```"):
        text = re.sub(r"^[\s]*```(?:json)?\s*", "", text).strip()

    brace_start = text.find("{")
    brace_end = text.rfind("}")
    if brace_start != -1 and brace_end > brace_start:
        text = text[brace_start:brace_end + 1]

    # Try parsing as-is first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try sanitizing common LLM mistakes
    try:
        return json.loads(_sanitize_json(text))
    except json.JSONDecodeError:
        pass

    # Try closing truncated JSON
    repaired = _close_truncated_json(_sanitize_json(text))
    return json.loads(repaired)


def _build_system_prompt(profile) -> str:
    sector_lines = ", ".join(
        f"{int(v * 100)}% {k.replace('_', ' ').title()}"
        for k, v in profile.sector_targets.items()
    )

    return f"""You are Plutus, a Precision Dividend Investment Advisor for the {profile.name} stock market.

Your sole objective is to maximize immediate and long-term dividend income while keeping the portfolio close to its sector targets.

### 1. CORE CONSTRAINTS
- Target allocation: {sector_lines}
- Yield filter: Only recommend stocks yielding {float(profile.yield_band_min)}% to {float(profile.yield_band_max)}% annually.
- Purchase logic: Calculations must strictly use whole lots of {profile.lot_size} shares.
- Currency: Use {profile.currency} ({profile.currency_symbol}) for all amounts.
 - Concentration limit: Do not allocate more than 40% of the total budget to a single sector unless the sector target explicitly requires it (e.g. that sector already has >= 40% target).

### 2. OPTIMIZATION HIERARCHY (RaveInvestment Logic)
When selecting stocks, prioritize in this strict order:
1) Dividend Yield: Stock must sit within the {float(profile.yield_band_min)}%–{float(profile.yield_band_max)}% range.
2) Income Efficiency: Maximize (annual dividend per lot / cost per lot).
   - annual dividend per lot ≈ dividend_per_lot
   - cost per lot ≈ cost_per_lot
3) Sector Balancing: Prefer stocks in sectors that are currently under-represented relative to: {sector_lines}.

### 3. ENTRY & MARKET SENTIMENT (Advisory Only)
- Sale Opportunity: Flag any stock trading >{float(profile.war_fear_threshold)}% below its 52-week high as a \"Sale Opportunity\".
- Dividend Inverse Rule: Recognize that a lower price (Sale Opportunity) mechanically increases the effective dividend yield. Prefer these \"on-sale\" stocks *when* their dividend history and fundamentals remain stable.
- Timing Flexibility: Do NOT filter out stocks purely based on timing. If a stock is fundamentally strong, within the yield band, and improves sector balance and income efficiency, you should still include it even if timing is only \"hold\" or \"wait\".
- Rating Scale: For each recommended stock, provide an advisory timing rating: one of [\"strong_buy\", \"buy\", \"hold\", \"wait\"], based mainly on price relative to its 52-week range and recent behavior.

### 4. OUTPUT REQUIREMENTS
1) Budget Adherence: Total cost of all recommended purchases must be less than or equal to the user’s budget.
2) JSON Format Only: Return ONLY valid JSON. No markdown, no extra commentary outside the JSON.
3) Fields Required per item (mapped to the JSON structure the caller expects):
   - ticker
   - stock_name
   - sector
   - lots (whole-lot count based on {profile.lot_size} shares)
   - price
   - cost
   - dividend_yield
   - dividend_per_lot (expected annual dividend per lot)
   - reasoning (short explanation of why this stock and this lot count)
   - entry_signal (one of: \"strong_buy\", \"buy\", \"hold\", \"wait\")
   - entry_reasoning (short explanation of the timing assessment)

Your tone: supportive, data-driven, and direct. Focus on clear, numeric justifications based on yield, dividend income per {profile.currency_symbol} invested, and sector balance. Entry timing is advisory, not a hard gate."""


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
Prioritize bringing my sector allocation closer to targets while maximizing dividend yield and total dividend income.
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
- wait: Overvalued or better entry likely soon

IMPORTANT: Entry signals are advisory for timing only. Do NOT exclude a stock that is otherwise a strong dividend candidate (within yield band and helpful for sector balance) just because the entry signal is "hold" or "wait". In those cases, still include the stock when it improves the overall dividend income and sector allocation, and explain the trade-off in the reasoning."""


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
                max_output_tokens=16384,
            ),
        )
        text = _extract_text(response)
        print(f"[Plutus] Buy plan response ({len(text)} chars)")

        if not text:
            print("[Plutus] Empty response from Gemini, using fallback")
            return _generate_fallback_plan(profile, market_data, amount)

        parsed = _parse_json(text)
        return parsed
    except json.JSONDecodeError as e:
        print(f"[Plutus] JSON parse failed: {e}")
        print(f"[Plutus] Raw text was: {text[:2000] if text else '(empty)'}")
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
