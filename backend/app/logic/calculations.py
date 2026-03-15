from app.core.constants import COMPOUNDING_FREQUENCY


def snowball_future_value(
    principal: float,
    monthly_topup: float,
    annual_yield: float,
    years: int,
    compounding_freq: int = COMPOUNDING_FREQUENCY,
) -> float:
    """
    FV = P(1 + r/n)^(nt) + PMT × ((1 + r/n)^(nt) - 1) / (r/n)
    """
    if annual_yield <= 0:
        return principal + monthly_topup * 12 * years

    r_n = annual_yield / compounding_freq
    nt = compounding_freq * years
    growth = (1 + r_n) ** nt

    return principal * growth + monthly_topup * (growth - 1) / r_n


def projected_annual_dividend(portfolio_value: float, weighted_yield: float) -> float:
    return portfolio_value * weighted_yield


def projected_monthly_income(annual_dividend: float) -> float:
    return annual_dividend / 12


def years_to_income_goal(
    current_value: float,
    monthly_topup: float,
    weighted_yield: float,
    monthly_goal: float,
    max_years: int = 50,
) -> float | None:
    """Binary search for how many years until monthly dividend income hits the goal."""
    annual_goal = monthly_goal * 12

    for year in range(1, max_years + 1):
        fv = snowball_future_value(current_value, monthly_topup, weighted_yield, year)
        annual_div = projected_annual_dividend(fv, weighted_yield)
        if annual_div >= annual_goal:
            # Interpolate within the last year
            prev_fv = snowball_future_value(current_value, monthly_topup, weighted_yield, year - 1)
            prev_div = projected_annual_dividend(prev_fv, weighted_yield)
            if annual_div == prev_div:
                return float(year)
            fraction = (annual_goal - prev_div) / (annual_div - prev_div)
            return round(year - 1 + fraction, 1)

    return None


def generate_projection_table(
    current_value: float,
    monthly_topup: float,
    weighted_yield: float,
    years: int = 10,
) -> list[dict]:
    # Year 0 = starting point (matches the Impact Preview numbers)
    annual_div_now = projected_annual_dividend(current_value, weighted_yield)
    rows = [{
        "year": 0,
        "portfolio_value": round(current_value, 2),
        "annual_dividend": round(annual_div_now, 2),
        "monthly_income": round(projected_monthly_income(annual_div_now), 2),
    }]
    for year in range(1, years + 1):
        fv = snowball_future_value(current_value, monthly_topup, weighted_yield, year)
        annual_div = projected_annual_dividend(fv, weighted_yield)
        monthly = projected_monthly_income(annual_div)
        rows.append({
            "year": year,
            "portfolio_value": round(fv, 2),
            "annual_dividend": round(annual_div, 2),
            "monthly_income": round(monthly, 2),
        })
    return rows


def generate_multi_scenario_projection(
    current_value: float,
    monthly_topup: float,
    weighted_yield: float,
    years: int = 10,
) -> list[dict]:
    conservative_rate = 0.04
    optimistic_rate = 0.07
    base_rate = max(weighted_yield, 0.01)

    scenarios = [
        {"label": "Conservative", "yield_rate": conservative_rate},
        {"label": "Base", "yield_rate": round(base_rate, 4)},
        {"label": "Optimistic", "yield_rate": optimistic_rate},
    ]

    result = []
    for s in scenarios:
        rows = generate_projection_table(current_value, monthly_topup, s["yield_rate"], years)
        result.append({
            "label": s["label"],
            "yield_rate": s["yield_rate"],
            "rows": rows,
        })
    return result
