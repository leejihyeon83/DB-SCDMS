from fastapi import FastAPI
from contextlib import asynccontextmanager

from backend.database import Base, engine, SessionLocal
from backend.utils.seed import (seed_raw_materials, seed_finished_goods, 
                                seed_gift_bom, seed_reindeer, create_ready_reindeer_view, 
                                seed_child_status_codes, seed_delivery_status_codes,
                                seed_staff,seed_child,seed_regions)
                     
from backend.models import (gift, child, reindeer, delivery_log, delivery_group, region)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_regions()
    seed_finished_goods()
    seed_raw_materials()
    seed_gift_bom()
    seed_reindeer()
    create_ready_reindeer_view()
    seed_child_status_codes()
    seed_delivery_status_codes()
    seed_staff() 
    seed_child() 
    yield 
    print("Shutting down...")

app = FastAPI(lifespan=lifespan)

# --- Routers ---
from backend.routers import (gift, production, reindeer, 
                             list_elf_child, child_status_code, 
                             delivery_status_code,list_elf_stats,
                             staff, list_elf_rules, santa_view,
                             santa, delivery_log, region)
app.include_router(gift.router)
app.include_router(production.router)
app.include_router(reindeer.router)
app.include_router(list_elf_child.router)
app.include_router(child_status_code.router)     # 아이 상태 코드 라우터
app.include_router(delivery_status_code.router)  # 배송 상태 코드 라우터
app.include_router(list_elf_stats.router) # Gift Demand 통계 라우터 등록
app.include_router(santa.router)
app.include_router(delivery_log.router)
app.include_router(staff.router)
app.include_router(list_elf_rules.router)
app.include_router(santa_view.router)
app.include_router(region.router)

from fastapi.staticfiles import StaticFiles
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
