from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import bcrypt

from backend.database import get_db
from backend.models.staff import Staff
from backend.schemas.auth import LoginRequest, LoginResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    # username으로 사용자 찾기
    user: Staff | None = db.query(Staff).filter(Staff.Username == payload.username).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 올바르지 않습니다.",
        )

    # bcrypt로 비밀번호 검증
    if not bcrypt.checkpw(
        payload.password.encode("utf-8"),
        user.Password.encode("utf-8"),
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 올바르지 않습니다.",
        )

    # 로그인 성공 -> 기본 정보 + Role 반환
    return LoginResponse(
        staff_id=user.StaffID,
        username=user.Username,
        name=user.Name,
        role=user.Role,
    )
