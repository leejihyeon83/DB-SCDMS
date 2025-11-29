'''
Child & Wishlist Model
------------------------
Child
 - 아이 기본 정보
 - 아이 상태(StatusCode)와 배송상태(DeliveryStatusCode)는 각각 다른 테이블을 FK로 참조
 - ChildNote는 아이 개별 행동/설명/메모

Wishlist
 - Child 1 : Wishlist N
 - Child 삭제 시 Wishlist도 같이 삭제되도록 CASCADE 처리
'''

from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from backend.database import Base

class Child(Base):
    __tablename__ = "child"

    # 기본 키
    ChildID = Column(Integer, primary_key=True, autoincrement=True)

    # 아이 기본 정보
    Name = Column(String, nullable=False)
    Address = Column(String, nullable=False)
    RegionID = Column(Integer, nullable=False)

    # 아이의 '행동/판정' 상태 → ChildStatusCode 테이블 참조
    StatusCode = Column(
        String,
        ForeignKey("child_status_code.Code"),
        nullable=False,
        default="PENDING"
    )

    # 아이의 '배송 상태' → DeliveryStatusCode 테이블 참조
    DeliveryStatusCode = Column(
        String,
        ForeignKey("delivery_status_code.Code"),
        nullable=False,
        default="PENDING"
    )

    # 아이 개별 메모 (행동 기록, 상태 사유 등)
    ChildNote = Column(String, nullable=True)

    # wishlist 관계 정의
    wishlist_items = relationship(
        "Wishlist",
        back_populates="child",
        cascade="all, delete-orphan",
        passive_deletes=True
    )


class Wishlist(Base):
    __tablename__ = "wishlist"

    WishlistID = Column(Integer, primary_key=True, autoincrement=True)

    # Child 삭제 시 CASCADE
    ChildID = Column(
        Integer,
        ForeignKey("child.ChildID", ondelete="CASCADE"),
        nullable=False
    )

    # GiftID는 Finished_Goods 테이블 참조
    GiftID = Column(
        Integer,
        ForeignKey("Finished_Goods.gift_id"),
        nullable=False
    )

    Priority = Column(Integer, nullable=False)

    # 역참조
    child = relationship("Child", back_populates="wishlist_items")
