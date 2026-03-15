from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import profiles, portfolio, market, allocate, watchlist

app = FastAPI(title="Plutus A.I", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profiles.router, prefix="/api/v1/profiles", tags=["profiles"])
app.include_router(portfolio.router, prefix="/api/v1/portfolio", tags=["portfolio"])
app.include_router(market.router, prefix="/api/v1/market", tags=["market"])
app.include_router(allocate.router, prefix="/api/v1/allocate", tags=["allocate"])
app.include_router(watchlist.router, prefix="/api/v1/watchlist", tags=["watchlist"])


@app.get("/health")
async def health():
    return {"status": "ok"}
