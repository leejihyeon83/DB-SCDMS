from fastapi import FastAPI
from contextlib import asynccontextmanager

from backend.database import Base, engine, SessionLocal
from backend.utils.seed import seed_raw_materials, seed_finished_goods, seed_gift_bom
from backend import models

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_finished_goods()
    seed_raw_materials()
    seed_gift_bom()
    yield 
    print("Shutting down...")

app = FastAPI(lifespan=lifespan)

# --- Routers ---
from backend.routers import gift
app.include_router(gift.router)
