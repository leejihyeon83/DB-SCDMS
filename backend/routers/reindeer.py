from sqlalchemy import text
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db, get_authorized_db
from backend.models.reindeer import Reindeer, ReindeerHealthLog
from backend.schemas.reindeer import ReindeerResponse, ReindeerUpdateStatus, HealthLogCreate, HealthLogResponse

router = APIRouter(prefix="/reindeer", tags=["reindeer"])


# 전체 루돌프 목록 조회
# GET /reindeer/
@router.get("/", response_model=list[ReindeerResponse])
def list_reindeer(db: Session = Depends(get_authorized_db)):
    reindeers = db.query(Reindeer).order_by(Reindeer.reindeer_id).all()
    return reindeers


# 상태 변경
# POST /reindeer/update-status
@router.post("/update-status", response_model=ReindeerResponse)
def update_reindeer_status(
    payload: ReindeerUpdateStatus,
    db: Session = Depends(get_authorized_db),
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
    
    # 자동 READY 변경 로직 추가
    # 체력이나 마력이 30 미만이면 자동 RESTING
    if reindeer.current_stamina < 30 or reindeer.current_magic < 30:
        reindeer.status = "RESTING"

    # 커밋 & 갱신
    db.commit()
    db.refresh(reindeer)

    return reindeer

# 루돌프 건강 로그 기록
@router.post("/log-health", response_model=HealthLogResponse)
def log_reindeer_health(
    payload: HealthLogCreate,
    db: Session = Depends(get_authorized_db),
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


# 특정 루돌프의 건강 로그 리스트 조회
@router.get("/{reindeer_id}/health-logs", response_model=list[HealthLogResponse])
def get_reindeer_health_logs(
    reindeer_id: int,
    db: Session = Depends(get_authorized_db),
):
    """
    특정 루돌프의 건강 로그 목록 조회
    - 최신 로그가 위로 오도록 내림차순 정렬
    """

    # 루돌프 존재 여부 확인 (없으면 404)
    reindeer = (
        db.query(Reindeer)
        .filter(Reindeer.reindeer_id == reindeer_id)
        .first()
    )
    if not reindeer:
        raise HTTPException(status_code=404, detail="Reindeer not found")

    # 해당 루돌프의 건강 로그 조회 (최근 순)
    logs = (
        db.query(ReindeerHealthLog)
        .filter(ReindeerHealthLog.reindeer_id == reindeer_id)
        .order_by(ReindeerHealthLog.log_timestamp.desc())
        .all()
    )

    return logs

# 비행 가능 루돌프 조회 API
@router.get("/available", response_model=list[ReindeerResponse])
def get_available_reindeer(
    magic_threshold: int = 50,
    db: Session = Depends(get_authorized_db),
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