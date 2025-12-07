import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from dotenv import load_dotenv
from fastapi import Depends, Header, HTTPException

# .env 로드
load_dotenv()

# 환경변수 읽기
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.")

# PostgreSQL 엔진 생성
engine = create_engine(DATABASE_URL)

# DB 세션 생성기
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False,)

# 모델 Base 클래스
Base = declarative_base()

# FastAPI 의존성 주입 함수
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        
ROLE_MAPPING = {
    "Santa": "role_santa",
    "ListElf": "role_listelf",
    "GiftElf": "role_giftelf",
    "Keeper": "role_keeper"
}

# 권한이 설정된 DB 세션 의존성 함수
def get_authorized_db(
    x_staff_id: str | None = Header(default=None, alias="x-staff-id"),
    db: Session = Depends(get_db)
):
    if not x_staff_id or not x_staff_id.isdigit():
        raise HTTPException(status_code=401, detail="X-Staff-ID header is missing or invalid.")

    staff_id = int(x_staff_id)

    from backend.models.staff import Staff
    staff = db.query(Staff).filter(Staff.StaffID == staff_id).first()

    if not staff:
        raise HTTPException(status_code=401, detail="Invalid Staff ID.")

    db_role = ROLE_MAPPING.get(staff.Role)

    if not db_role:
        raise HTTPException(status_code=403, detail=f"Role '{staff.Role}' is not mapped to a DB role.")

    try:
        # 권한 부여
        db.execute(text(f"SET ROLE {db_role}"))
        
        yield db

    except Exception as e:
        # 로직 수행 중 에러 발생 시 롤백
        db.rollback()
        raise e

    finally:
        try:
            db.execute(text("RESET ROLE"))
        except Exception:
            db.rollback()
        db.close()