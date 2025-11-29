'''
DeliveryStatusCode
--------------------
배송 진행 상태를 저장하는 기준 테이블.

- Child.DeliveryStatusCode FK의 대상
- 예: PENDING, PACKED, READY, DELIVERED
- ChildStatusCode와 역할이 다르므로 반드시 분리 관리해야 함
'''

from sqlalchemy import Column, String
from backend.database import Base

class DeliveryStatusCode(Base):
    __tablename__ = "delivery_status_code"

    # 배송 상태 코드 (PK)
    Code = Column(String, primary_key=True)

    # 설명 (UI용)
    Description = Column(String, nullable=False)
