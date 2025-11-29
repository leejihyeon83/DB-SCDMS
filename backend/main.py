from fastapi import FastAPI
from contextlib import asynccontextmanager

from backend.database import Base, engine, SessionLocal
from backend.utils.seed import seed_raw_materials, seed_finished_goods, seed_gift_bom, seed_reindeer, create_ready_reindeer_view
from backend.models import gift, child, reindeer

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_finished_goods()
    seed_raw_materials()
    seed_gift_bom()
    seed_reindeer()
    create_ready_reindeer_view()
    yield 
    print("Shutting down...")

app = FastAPI(lifespan=lifespan)

# --- Routers ---
from backend.routers import gift, production, reindeer, list_elf_child
app.include_router(gift.router)
app.include_router(production.router)
app.include_router(reindeer.router)
app.include_router(list_elf_child.router)