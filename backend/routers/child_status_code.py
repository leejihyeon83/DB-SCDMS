'''
Child Status Code Router
-------------------------
아이의 판정/행동 상태 목록을 관리하는 라우터.

- ChildStatusCode 테이블의 CRUD 제공
- Child의 StatusCode가 참조 중이면 DELETE 불가
'''

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db

from backend.models.child_status_code import ChildStatusCode
from backend.schemas.status_code_schema import StatusCodeCreate, StatusCodeUpdate, StatusCodeOut
from backend.models.child import Child
from sqlalchemy import func

router = APIRouter(prefix="/child-status-codes", tags=["Child Status Code"])


# 모든 상태 목록 조회
@router.get("/", response_model=list[StatusCodeOut])
def get_codes(db: Session = Depends(get_db)):
    codes = db.query(ChildStatusCode).all()
    return [StatusCodeOut(code=c.Code, description=c.Description) for c in codes]


# 새로운 상태 코드 생성
@router.post("/", response_model=StatusCodeOut)
def create_code(payload: StatusCodeCreate, db: Session = Depends(get_db)):
    exists = db.query(ChildStatusCode).filter(ChildStatusCode.Code == payload.code).first()
    if exists:
        raise HTTPException(409, "Code already exists")

    code = ChildStatusCode(Code=payload.code, Description=payload.description)
    db.add(code)
    db.commit()

    return StatusCodeOut.from_orm(code)


# description 수정
@router.patch("/{code}", response_model=StatusCodeOut)
def update_code(code: str, payload: StatusCodeUpdate, db: Session = Depends(get_db)):
    row = db.query(ChildStatusCode).filter(ChildStatusCode.Code == code).first()
    if not row:
        raise HTTPException(404, "Not found")

    row.Description = payload.description
    db.commit()

    return StatusCodeOut.from_orm(row)


# Child가 참조 중이면 삭제 불가
@router.delete("/{code}")
def delete_code(code: str, db: Session = Depends(get_db)):

    # Child.StatusCode에서 참조 중인지 체크
    ref = db.query(func.count(Child.ChildID)).filter(Child.StatusCode == code).scalar()

    if ref > 0:
        raise HTTPException(409, "Code referenced by child")

    row = db.query(ChildStatusCode).filter(ChildStatusCode.Code == code).first()
    if not row:
        raise HTTPException(404, "Not found")

    db.delete(row)
    db.commit()
    return {"message": "Deleted"}
