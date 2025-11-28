from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.gift import RawMaterial, FinishedGoods
from backend.schemas.gift import MaterialUpdate, Gift, ProduceRequest

router = APIRouter(prefix="/gift", tags=["Gift"])

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
@router.get("/", response_model=list[Gift])
def get_all_gifts(db: Session = Depends(get_db)):
    goods = db.query(FinishedGoods).all()
    return goods

# 생산하여 재고 증가시키기
# POST /gift/produce
@router.post("/produce")
def produce_item(data: ProduceRequest, db: Session = Depends(get_db)):

    good = db.query(FinishedGoods).filter_by(gift_id=data.gift_id).first()

    if not good:
        raise HTTPException(status_code=404, detail="해당 선물이 존재하지 않습니다.")

    # 음수 생산 방지
    if data.produced_quantity <= 0:
        raise HTTPException(status_code=400, detail="생산 수량은 1 이상이어야 합니다.")

    # 재고 증가
    good.stock_quantity += data.produced_quantity

    db.commit()

    return {
        "message": "생산 완료",
        "gift_id": good.gift_id,
        "new_stock": good.stock_quantity
    }