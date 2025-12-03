from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db, get_authorized_db
from backend.models.gift import RawMaterial, FinishedGoods, GiftBOM, ProductionLog, ProductionUsage
from backend.schemas.gift import ProductionCreateRequest, ProductionLogResponse
from backend.utils.transactions import transactional_session

router = APIRouter(prefix="/production", tags=["Production"])


@router.post("/create")
def create_production_job(data: ProductionCreateRequest, db: Session = Depends(get_authorized_db)):
    """
    생산 Job 1건을 생성하고
    - 재료 재고 검증
    - 재료 차감
    - Finished_Goods 재고 증가
    - Production_Log / Production_Usage 기록을 한 트랜잭션으로 처리
    """

    # ============================
    # 사전 검증: 트랜잭션을 시작하기 전에 요청이 유효한지 미리 확인
    # ============================

    # 선물 존재 여부
    gift = (
        db.query(FinishedGoods)
        .filter_by(gift_id=data.gift_id)
        .first()
    )
    if not gift:
        raise HTTPException(
            status_code=404,
            detail="해당 선물이 존재하지 않습니다.",
        )

    # 생산 수량 검증
    if data.produced_quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="생산 수량은 1 이상이어야 합니다.",
        )

    # 레시피 조회
    boms = (
        db.query(GiftBOM)
        .filter_by(output_gift_id=data.gift_id)
        .all()
    )
    if not boms:
        raise HTTPException(
            status_code=400,
            detail="해당 선물에 대한 레시피가 등록되어 있지 않습니다.",
        )

    # 재료 부족 검사
    shortages = []

    for bom in boms:
        material = (
            db.query(RawMaterial)
            .filter_by(material_id=bom.input_material_id)
            .first()
        )

        if not material:
            raise HTTPException(
                status_code=400,
                detail=f"레시피에 포함된 재료(ID: {bom.input_material_id})가 존재하지 않습니다.",
            )

        required = bom.quantity_required * data.produced_quantity

        if material.stock_quantity < required:
            shortages.append({
                "material_id": material.material_id,
                "material_name": material.material_name,
                "required": required,
                "available": material.stock_quantity,
            })

    # 재료 부족 시: 트랜잭션 들어가기 전에 바로 에러 반환 -> DB 변경 없음
    if shortages:
        names = ", ".join([s["material_name"] for s in shortages])
        raise HTTPException(
            status_code=400,
            detail={
                "message": f"다음 재료 재고 부족으로 생산 Job을 생성할 수 없습니다: {names}",
                "shortages": shortages,
            },
        )

    # ==================================
    # 트랜잭션 구간
    # ==================================
    with transactional_session(db):
        # Raw_Materials 재고 차감
        for bom in boms:
            material = (
                db.query(RawMaterial)
                .filter_by(material_id=bom.input_material_id)
                .first()
            )
            used = bom.quantity_required * data.produced_quantity
            material.stock_quantity -= used

        # Finished_Goods 재고 증가
        gift.stock_quantity += data.produced_quantity

        # Production_Log INSERT
        log = ProductionLog(
            gift_id=gift.gift_id,
            quantity_produced=data.produced_quantity,
            produced_by_staff_id=data.staff_id,
        )
        db.add(log)
        db.flush()  # job_id 확보

        # Production_Usage INSERT
        for bom in boms:
            used = bom.quantity_required * data.produced_quantity
            usage = ProductionUsage(
                job_id=log.job_id,
                material_id=bom.input_material_id,
                quantity_used=used,
            )
            db.add(usage)

        # 여기서 예외가 없으면 contextmanager가 db.commit()
        # 예외가 발생하면 db.rollback() 후 예외 재전파

        db.refresh(log)
        db.refresh(gift)

    return {
        "message": "생산 Job 생성 완료",
        "job_id": log.job_id,
        "gift_id": gift.gift_id,
        "quantity_produced": log.quantity_produced,
        "produced_by_staff_id": log.produced_by_staff_id,
        "new_gift_stock": gift.stock_quantity,
    }

@router.get("/logs", response_model=List[ProductionLogResponse])
def get_production_logs(db: Session = Depends(get_authorized_db)):
    """
    Production_Log 테이블의 생산 Job 기록 전체 조회 API.

    - 최근에 생성된 Job 순으로 정렬해서 반환
    - 추후 gift_id, staff_id, 날짜 범위 등 필터를 추가해 확장 가능
    """
    logs = (
        db.query(ProductionLog)
        .order_by(ProductionLog.timestamp.desc())
        .all()
    )
    return logs