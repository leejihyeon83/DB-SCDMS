from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from backend.database import Base


class DeliveryGroup(Base):
    __tablename__ = "delivery_group"

    group_id = Column(Integer, primary_key=True, index=True)

    # 산타가 붙이는 그룹 이름
    group_name = Column(String, nullable=False)

    # 이 그룹에 배정된 루돌프
    reindeer_id = Column(
        Integer,
        ForeignKey("reindeer.reindeer_id"),
        nullable=False,
    )
    
    # 그룹 생성자 ID 기록
    created_by_staff_id = Column(
        Integer,
        ForeignKey("staff.StaffID"),
        nullable=True, 
    )

    # PENDING / FAILED / DONE
    status = Column(String, nullable=False, default="PENDING")

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    # 한 그룹에 여러 아이/선물이 들어감
    items = relationship(
        "DeliveryGroupItem",
        back_populates="group",
        cascade="all, delete-orphan",
    )


class DeliveryGroupItem(Base):
    __tablename__ = "delivery_group_item"

    group_item_id = Column(Integer, primary_key=True, index=True)

    group_id = Column(
        Integer,
        ForeignKey("delivery_group.group_id"),
        nullable=False,
    )

    # 어떤 아이에게
    child_id = Column(
        Integer,
        ForeignKey("child.ChildID"),
        nullable=False,
    )

    # 어떤 선물을
    gift_id = Column(
        Integer,
        ForeignKey("Finished_Goods.gift_id"),
        nullable=False,
    )

    group = relationship("DeliveryGroup", back_populates="items")
