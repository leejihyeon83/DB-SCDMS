from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.gift import RawMaterial
from backend.schemas.gift import MaterialUpdate

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

