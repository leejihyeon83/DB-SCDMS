from sqlalchemy import text
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.reindeer import Reindeer, ReindeerHealthLog
from backend.schemas.reindeer import ReindeerResponse, ReindeerUpdateStatus, HealthLogCreate, HealthLogResponse

router = APIRouter(prefix="/reindeer", tags=["reindeer"])


# 전체 루돌프 목록 조회
# GET /reindeer/
@router.get("/", response_model=list[ReindeerResponse])
def list_reindeer(db: Session = Depends(get_db)):
    reindeers = db.query(Reindeer).order_by(Reindeer.reindeer_id).all()
    return reindeers


# 상태 변경
# POST /reindeer/update-status
@router.post("/update-status", response_model=ReindeerResponse)
def update_reindeer_status(
    payload: ReindeerUpdateStatus,
    db: Session = Depends(get_db),
):
    # 존재 여부 확인
    reindeer = (
        db.query(Reindeer)
        .filter(Reindeer.reindeer_id == payload.reindeer_id)
        .first()
    )
    if not reindeer:
        raise HTTPException(status_code=404, detail="Reindeer not found")

    # 상태 변경
    reindeer.status = payload.status
    reindeer.current_stamina = payload.current_stamina
    reindeer.current_magic = payload.current_magic

    # 커밋 & 갱신
    db.commit()
    db.refresh(reindeer)

    return reindeer

# 루돌프 건강 로그 기록
@router.post("/log-health", response_model=HealthLogResponse)
def log_reindeer_health(
    payload: HealthLogCreate,
    db: Session = Depends(get_db),
):
    # 대상 루돌프 존재 여부 확인
    reindeer = (
        db.query(Reindeer)
        .filter(Reindeer.reindeer_id == payload.reindeer_id)
        .first()
    )
    if not reindeer:
        raise HTTPException(status_code=404, detail="Reindeer not found")

    # Health Log 생성
    log = ReindeerHealthLog(
        reindeer_id=payload.reindeer_id,
        notes=payload.notes,
        # log_timestamp는 넣지 않음 → DB에서 now() 자동 설정
    )

    db.add(log)
    db.commit()
    db.refresh(log)

    return log

# 비행 가능 루돌프 조회 API
@router.get("/available", response_model=list[ReindeerResponse])
def get_available_reindeer(
    magic_threshold: int = 50,
    db: Session = Depends(get_db),
):
    """
    비행 가능 루돌프 조회
    - DB VIEW `ready_reindeer_view` 기준
    - current_magic >= magic_threshold 조건 추가
    """
    rows = db.execute(
        text("""
            SELECT
                reindeer_id,
                name,
                current_stamina,
                current_magic,
                status
            FROM ready_reindeer_view
            WHERE current_magic >= :magic_threshold
            ORDER BY reindeer_id
        """),
        {"magic_threshold": magic_threshold},
    ).mappings().all()

    return [ReindeerResponse.model_validate(row) for row in rows]