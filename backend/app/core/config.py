from pathlib import Path

from pydantic_settings import BaseSettings
from functools import lru_cache

_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://plutus:plutus@localhost:5432/plutus"
    redis_url: str = "redis://localhost:6379/0"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3-flash-preview"
    alpha_vantage_api_key: str = ""
    market_cache_ttl_minutes: int = 60

    model_config = {"env_file": str(_ROOT / ".env"), "env_file_encoding": "utf-8", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    """Cached settings from .env. Restart backend if you change .env values."""
    s = Settings()
    masked = s.gemini_api_key[:8] + "..." if len(s.gemini_api_key) > 8 else "(empty)"
    print(f"[Plutus] Settings loaded. GEMINI_API_KEY={masked}")
    return s
