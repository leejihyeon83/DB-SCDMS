from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func

from backend.database import Base


class DeliveryLog(Base):
    __tablename__ = "delivery_log"

    log_id = Column(Integer, primary_key=True, index=True)

    # 누가 선물을 받았는지
    child_id = Column(
        Integer,
        ForeignKey("child.ChildID"),
        nullable=False,
    )

    # 어떤 선물을 받았는지
    gift_id = Column(
        Integer,
        ForeignKey("Finished_Goods.gift_id"),
        nullable=False,
    )

    delivered_by_staff_id = Column(
        Integer,
        ForeignKey("staff.StaffID"),
        nullable=True,
    )

    delivery_timestamp = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )
