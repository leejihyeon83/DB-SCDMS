from fastapi import FastAPI
from contextlib import asynccontextmanager

from backend.database import Base, engine, SessionLocal
from backend.utils.seed import (seed_raw_materials, seed_finished_goods, 
                                seed_gift_bom, seed_reindeer, create_ready_reindeer_view, 
                                seed_child_status_codes, seed_delivery_status_codes)
from backend.models import (gift, child, reindeer)

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_finished_goods()
    seed_raw_materials()
    seed_gift_bom()
    seed_reindeer()
    create_ready_reindeer_view()
    seed_child_status_codes()
    seed_delivery_status_codes()
    yield 
    print("Shutting down...")

app = FastAPI(lifespan=lifespan)

# --- Routers ---
from backend.routers import (gift, production, reindeer, 
                             list_elf_child, child_status_code, 
                             delivery_status_code,list_elf_stats)
app.include_router(gift.router)
app.include_router(production.router)
app.include_router(reindeer.router)
app.include_router(list_elf_child.router)
app.include_router(child_status_code.router)     # 아이 상태 코드 라우터
app.include_router(delivery_status_code.router)  # 배송 상태 코드 라우터
app.include_router(list_elf_stats.router) # Gift Demand 통계 라우터 등록