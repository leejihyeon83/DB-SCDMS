from sqlalchemy import Column, String
from backend.database import Base

class ChildStatusCode(Base):
    __tablename__ = "child_status_code"

    # 상태 코드 (PK)
    # 값: NICE, NAUGHTY, PENDING
    Code = Column(String, primary_key=True)

    # UI / 설명용 문구
    Description = Column(String, nullable=False)
