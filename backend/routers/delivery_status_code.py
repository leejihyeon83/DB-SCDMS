from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db, get_authorized_db
from backend.models.delivery_status_code import DeliveryStatusCode
from backend.schemas.status_code_schema import (
    StatusCodeCreate,
    StatusCodeUpdate,
    StatusCodeOut,
)

router = APIRouter(
    prefix="/delivery-status-codes",
    tags=["Delivery Status Codes"],
)

# 전체 목록 조회
@router.get("/", response_model=list[StatusCodeOut])
def list_codes(db: Session = Depends(get_authorized_db)):
    """
    배송 상태 코드 전체 조회
    """
    rows = db.query(DeliveryStatusCode).all()
    # Code / Description -> code / description 변환
    return [StatusCodeOut.from_orm(r) for r in rows]


# 상태 코드 생성
@router.post("/", response_model=StatusCodeOut, status_code=status.HTTP_201_CREATED)
def create_code(payload: StatusCodeCreate, db: Session = Depends(get_authorized_db)):
    """
    새로운 배송 상태 코드 생성
    - code 중복 시 409 Conflict
    """

    # 이미 같은 code가 있는지 확인
    existing = (
        db.query(DeliveryStatusCode)
        .filter(DeliveryStatusCode.Code == payload.code)
        .first()
    )
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Code already exists")

    # 실제 DB 컬럼 이름: Code / Description (대문자)
    new_row = DeliveryStatusCode(
        Code=payload.code,
        Description=payload.description,
    )

    db.add(new_row)
    db.commit()
    db.refresh(new_row)

    return StatusCodeOut.from_orm(new_row)


# 상태 코드 설명 수정 (description만)
@router.patch("/{code}", response_model=StatusCodeOut)
def update_code(code: str, payload: StatusCodeUpdate, db: Session = Depends(get_authorized_db)):
    """
    배송 상태 코드 설명(description) 수정
    - code는 PK이므로 변경 불가
    """

    row = (
        db.query(DeliveryStatusCode)
        .filter(DeliveryStatusCode.Code == code)
        .first()
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Code not found")

    # description만 수정
    row.Description = payload.description

    db.commit()
    db.refresh(row)

    return StatusCodeOut.from_orm(row)


# 상태 코드 삭제
@router.delete("/{code}")
def delete_code(code: str, db: Session = Depends(get_authorized_db)):
    """
    배송 상태 코드 삭제
    - 아직 Child.DeliveryStatusCode에서 FK로 참조 중이면 나중에 막을 수도 있음
    """

    row = (
        db.query(DeliveryStatusCode)
        .filter(DeliveryStatusCode.Code == code)
        .first()
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Code not found")

    db.delete(row)
    db.commit()

    return {"message": f"DeliveryStatusCode '{code}' deleted successfully"}
