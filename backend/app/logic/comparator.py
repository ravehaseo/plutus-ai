from dataclasses import dataclass


@dataclass
class StockRanking:
    ticker: str
    stock_name: str
    sector: str
    price: float
    dividend_yield: float
    cost_per_lot: float
    dividend_per_lot: float
    yield_per_rm: float
    war_fear_discount: float
    is_sale_opportunity: bool


def rank_stocks(
    market_data: list[dict],
    lot_size: int,
    war_fear_threshold: float = 10.0,
) -> list[StockRanking]:
    """Rank watchlist stocks by dividend income per RM invested, flag sale opportunities."""
    rankings = []
    for item in market_data:
        price = item.get("last_close") or 0
        annual_div = item.get("annual_dividend") or 0
        high_52 = item.get("week_52_high") or 0
        div_yield = item.get("dividend_yield") or 0

        cost_per_lot = price * lot_size
        dividend_per_lot = annual_div * lot_size
        yield_per_rm = (dividend_per_lot / cost_per_lot) if cost_per_lot > 0 else 0

        discount = ((high_52 - price) / high_52 * 100) if high_52 > 0 else 0

        rankings.append(StockRanking(
            ticker=item["ticker"],
            stock_name=item.get("stock_name", ""),
            sector=item.get("sector", ""),
            price=round(price, 4),
            dividend_yield=round(div_yield, 4),
            cost_per_lot=round(cost_per_lot, 2),
            dividend_per_lot=round(dividend_per_lot, 2),
            yield_per_rm=round(yield_per_rm, 6),
            war_fear_discount=round(discount, 2),
            is_sale_opportunity=discount >= war_fear_threshold,
        ))

    rankings.sort(key=lambda r: r.yield_per_rm, reverse=True)
    return rankings
