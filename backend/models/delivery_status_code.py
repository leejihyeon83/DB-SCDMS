from sqlalchemy import Column, String
from backend.database import Base

class DeliveryStatusCode(Base):
    __tablename__ = "delivery_status_code"

    # 배송 상태 코드 (PK)
    Code = Column(String, primary_key=True)

    # 설명 (UI용)
    Description = Column(String, nullable=False)
