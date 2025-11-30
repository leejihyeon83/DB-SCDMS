'''
Staff 관련 API
- 간단한 Staff 생성 및 조회용
- 추후 로그인 기능(JWT 등)을 붙일 수 있는 기반 -> 이긴 하나 사용x 예정
'''

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.staff import Staff
from backend.schemas.staff_schema import StaffCreate, StaffOut

router = APIRouter(
    prefix="/staff",
    tags=["Staff"],
)


@router.post("", response_model=StaffOut, status_code=status.HTTP_201_CREATED)
def create_staff(payload: StaffCreate, db: Session = Depends(get_db)):
    '''
    Staff 계정 생성
    - Username 중복 체크
    '''

    exists = db.query(Staff).filter(Staff.Username == payload.username).first()
    if exists:
        raise HTTPException(
            status_code=400,
            detail="이미 존재하는 Username 입니다.",
        )

    staff = Staff(
        Username=payload.username,
        Password=payload.password,  # 단순 문자열, 추후 해싱 확장 가능
        Name=payload.name,
        Role=payload.role,
    )

    db.add(staff)
    db.commit()
    db.refresh(staff)

    return StaffOut(
        staff_id=staff.StaffID,
        username=staff.Username,
        name=staff.Name,
        role=staff.Role,
    )


@router.get("", response_model=list[StaffOut])
def get_staff_list(db: Session = Depends(get_db)):
    '''
    Staff 전체 목록 조회
    - 운영자 계정 확인용 (관리자 화면에서 사용)
    '''
    staff_list = db.query(Staff).all()

    return [
        StaffOut(
            staff_id=s.StaffID,
            username=s.Username,
            name=s.Name,
            role=s.Role,
        )
        for s in staff_list
    ]
