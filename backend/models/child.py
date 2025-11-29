'''
Child / Wishlist / FinishedGoods
- Child: 아이 기본 정보
- Wishlist: 아이가 원하는 선물 목록 (1:N)
- FinishedGoods: 선물 테이블 (GiftID 유효성 검증용)
'''

from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from backend.database import Base

# Child (아이 정보 테이블)
class Child(Base):
    __tablename__ = "child"

    ChildID = Column(Integer, primary_key=True, autoincrement=True)
    Name = Column(String, nullable=False)
    Address = Column(String, nullable=False)
    RegionID = Column(Integer, nullable=False)

    # 아이 등록 시 기본값은 모두 Pending
    StatusCode = Column(String, nullable=False, default="Pending")
    DeliveryStatusCode = Column(String, nullable=False, default="Pending")

    # Child 1명 -> Wishlist 여러 개 (1:N 관계)
    wishlist_items = relationship(
        "Wishlist",
        back_populates="child",
        cascade="all, delete-orphan"
    )


# Wishlist (아이의 선호 선물 목록)
class Wishlist(Base):
    __tablename__ = "wishlist"

    WishlistID = Column(Integer, primary_key=True, autoincrement=True)
    ChildID = Column(Integer, ForeignKey("child.ChildID"), nullable=False) # 어떤 아이의 wishlist인지
    # 어떤 선물인지
    GiftID = Column(Integer, ForeignKey("Finished_Goods.gift_id"), nullable=False)
    Priority = Column(Integer, nullable=False)  # 우선순위(1이 가장 높음)

    child = relationship("Child", back_populates="wishlist_items")
