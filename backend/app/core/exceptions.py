class PlutusError(Exception):
    """Base exception for all Plutus operations."""


class MarketDataError(PlutusError):
    """yfinance or Alpha Vantage fetch failed."""


class InvalidTickerError(PlutusError):
    """Ticker not found or delisted."""


class InsufficientFundsError(PlutusError):
    """Allocation amount too small to buy any lots."""


class NewsUnavailableError(PlutusError):
    """Gemini search grounding or RSS feed unreachable."""
