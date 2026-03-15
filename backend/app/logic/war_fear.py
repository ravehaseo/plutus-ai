from decimal import Decimal


def calculate_discount(current_price: float, week_52_high: float) -> float:
    """Return percentage discount from 52-week high (positive = below high)."""
    if not week_52_high or week_52_high <= 0:
        return 0.0
    return round(((week_52_high - current_price) / week_52_high) * 100, 2)


def is_sale_opportunity(discount: float, threshold: float = 10.0) -> bool:
    """True if stock is discounted more than the threshold from its 52-week high."""
    return discount >= threshold
