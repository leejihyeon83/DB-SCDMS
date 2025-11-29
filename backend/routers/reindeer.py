from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.reindeer import Reindeer
from backend.schemas.reindeer import ReindeerResponse, ReindeerUpdateStatus

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

    # 커밋 & 갱신
    db.commit()
    db.refresh(reindeer)

    return reindeer
