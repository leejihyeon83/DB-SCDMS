from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.database import get_db
from backend.models.gift import RawMaterial, FinishedGoods, GiftBOM
from backend.schemas.gift import MaterialUpdate, Gift, ProduceRequest, GiftRecipeItem

router = APIRouter(prefix="/gift", tags=["Gift"])

# 원자재 채굴
# POST /gift/materials/mine
@router.post("/materials/mine")
def mine_material(data: MaterialUpdate, db: Session = Depends(get_db)):
    
    # 음수 요청 자체 차단
    if data.amount < 0:
        raise HTTPException(
            status_code=400,
            detail="채굴량(amount)은 음수일 수 없습니다."
        )

    material = db.query(RawMaterial).filter_by(material_id=data.material_id).first()

    if not material:
        raise HTTPException(status_code=404, detail="해당 재료가 존재하지 않습니다.")

    # 재고 음수 방지
    new_quantity = material.stock_quantity + data.amount
    if new_quantity < 0:
        raise HTTPException(
            status_code=400,
            detail=f"재고 부족으로 인해 재고가 음수가 될 수 없습니다. (현재 재고: {material.stock_quantity})"
        )

    # 정상 업데이트
    material.stock_quantity = new_quantity
    db.commit()
    db.refresh(material)

    return {
        "message": "재료 재고 업데이트 완료",
        "material_id": material.material_id,
        "stock_quantity": material.stock_quantity
    }

# 전체 선물 재고 조회
# GET /gift/
@router.get("/", response_model=List[Gift])
def get_all_gifts(db: Session = Depends(get_db)):
    goods = db.query(FinishedGoods).all()
    return goods

# 선물 생산하여 재고 증가시키기 (레시피 + 재료 재고 체크 + 부족한 재료 반환)
# POST /gift/produce
@router.post("/produce")
def produce_item(data: ProduceRequest, db: Session = Depends(get_db)):
    """
    Gift_BOM 레시피를 사용해 선물 생산을 처리하는 간단 API

    - 요청한 선물(gift_id)과 수량에 따라 필요한 재료량 계산
    - 재료 재고가 부족하면 오류 반환
    - 재료가 충분하면 Raw_Materials 재고 차감
    - Finished_Goods 재고 증가

    Production_Log / Production_Usage 기록은 남기지 않음 -> 실제 요정 UI에서 사용할 API는 /production/create
    """


    # 선물 존재 여부 확인
    good = db.query(FinishedGoods).filter_by(gift_id=data.gift_id).first()
    if not good:
        raise HTTPException(status_code=404, detail="해당 선물이 존재하지 않습니다.")

    # 생산 수량 검증
    if data.produced_quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="생산 수량은 1 이상이어야 합니다."
        )

    # 레시피 조회 (GiftBOM)
    boms = db.query(GiftBOM).filter_by(output_gift_id=data.gift_id).all()
    if not boms:
        raise HTTPException(
            status_code=400,
            detail="해당 선물에 대한 레시피가 등록되어 있지 않습니다."
        )

    # 재료 재고 충분한지 먼저 전부 검사
    shortages = []  # 부족한 재료들

    for bom in boms:
        material = (
            db.query(RawMaterial)
            .filter_by(material_id=bom.input_material_id)
            .first()
        )

        if not material:
            raise HTTPException(
                status_code=400,
                detail=f"레시피에 포함된 재료(ID: {bom.input_material_id})가 존재하지 않습니다."
            )

        required = bom.quantity_required * data.produced_quantity

        if material.stock_quantity < required:
            shortages.append({
                "material_id": material.material_id,
                "material_name": material.material_name,
                "required": required,
                "available": material.stock_quantity,
            })

    # 하나라도 부족하면 전체 생산 실패
    if shortages:
        names = ", ".join([s["material_name"] for s in shortages])
        raise HTTPException(
            status_code=400,
            detail={
                "message": f"다음 재료 재고 부족으로 생산할 수 없습니다: {names}",
                "shortages": shortages,
            },
        )

    # 검증 통과 -> 실제로 재료 차감 + 선물 재고 증가
    for bom in boms:
        material = (
            db.query(RawMaterial)
            .filter_by(material_id=bom.input_material_id)
            .first()
        )
        required = bom.quantity_required * data.produced_quantity
        material.stock_quantity -= required

    good.stock_quantity += data.produced_quantity

    db.commit()
    db.refresh(good)

    return {
        "message": "생산 완료",
        "gift_id": good.gift_id,
        "produced_quantity": data.produced_quantity,
        "new_gift_stock": good.stock_quantity,
    }
    
# 선물 레시피 반환
# GET /gift/{gift_id}/recipe
@router.get("/{gift_id}/recipe", response_model=List[GiftRecipeItem])
def get_gift_recipe(gift_id: int, db: Session = Depends(get_db)):
    # GiftBOM + RawMaterial 조인해서 가져오기
    rows = (
        db.query(GiftBOM, RawMaterial)
        .join(RawMaterial, GiftBOM.input_material_id == RawMaterial.material_id)
        .filter(GiftBOM.output_gift_id == gift_id)
        .all()
    )

    if not rows:
        # 레시피가 없으면 404 에러
        raise HTTPException(
            status_code=404,
            detail="해당 선물에 대한 레시피가 등록되어 있지 않습니다.",
        )

    # Pydantic 스키마 형태로 변환해서 반환
    return [
        GiftRecipeItem(
            material_id=material.material_id,
            material_name=material.material_name,
            quantity_required=bom.quantity_required,
        )
        for bom, material in rows
    ]