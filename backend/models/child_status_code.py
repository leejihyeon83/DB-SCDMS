'''
ChildStatusCode
----------------
아이의 ‘행동/판정’ 상태를 저장하는 기준 테이블.

- 이 테이블은 Child.StatusCode FK의 대상
- 예: NICE / NAUGHTY / PENDING
- 배송 상태는 DeliveryStatusCode 테이블에서 관리하므로 여기엔 넣지 않음
'''

from sqlalchemy import Column, String
from backend.database import Base

class ChildStatusCode(Base):
    __tablename__ = "child_status_code"

    # 상태 코드 (PK)
    # 값 예: NICE, NAUGHTY, PENDING
    Code = Column(String, primary_key=True)

    # UI / 설명용 문구
    Description = Column(String, nullable=False)
