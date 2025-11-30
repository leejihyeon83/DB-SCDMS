'''
Staff 모델
- SCDMS 시스템을 사용하는 내부 사용자(운영자) 계정 정보
- Username + Password + Role 기반의 단순 인증/권한 구조
'''

from sqlalchemy import Column, Integer, String
from backend.database import Base


class Staff(Base):
    __tablename__ = "staff"

    # 기본 키
    StaffID = Column(Integer, primary_key=True, autoincrement=True)

    # 로그인용 ID (중복 불가)
    Username = Column(String, unique=True, nullable=False)

    # 간단 비밀번호 (해싱은 추후 확장 가능)
    Password = Column(String, nullable=False)

    # 화면에 표시할 이름
    Name = Column(String, nullable=False)

    # 역할: ListElf / Santa / GiftElf / Keeper 등
    Role = Column(String, nullable=False)
