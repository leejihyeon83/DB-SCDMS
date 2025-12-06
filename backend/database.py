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
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

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
    x_staff_id: str | None = Header(default=None, alias="x-staff-id"), # Header를 통해 StaffID 획득
    db: Session = Depends(get_db)
):
    # 보안이 필요한 라우터에서는 Staff ID가 필수
    if not x_staff_id or not x_staff_id.isdigit():
        raise HTTPException(status_code=401, detail="X-Staff-ID header is missing or invalid.")

    staff_id = int(x_staff_id)

    from backend.models.staff import Staff

    # Staff 테이블에서 사용자 정보 조회 (인증된 사용자인지 확인)
    staff = db.query(Staff).filter(Staff.StaffID == staff_id).first()
    
    if not staff:
        raise HTTPException(status_code=401, detail="Invalid Staff ID.")

    # Staff 테이블의 Role을 DB Role 이름으로 매핑
    db_role = ROLE_MAPPING.get(staff.Role)

    if not db_role:
        # DB 역할이 정의되지 않은 Staff Role인 경우
        raise HTTPException(status_code=403, detail=f"Role '{staff.Role}' is not mapped to a DB role.")

    # SET ROLE 실행 (현재 DB 세션의 권한을 변경)
    try:
        db.execute(text(f"SET ROLE {db_role}")) 
        
        yield db  # 권한이 설정된 세션을 라우터에 전달
        
    finally:
        # 세션이 반환될 때 역할 초기화
        db.execute(text("RESET ROLE"))