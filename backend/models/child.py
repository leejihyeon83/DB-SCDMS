'''
Child / Wishlist
- Child: 아이 기본 정보
- Wishlist: 아이가 원하는 선물 목록 (1:N)
- StatusCode / DeliveryStatusCode 는 기본값 "Pending"
- wishlist_items 관계에 cascade 설정 -> Child 삭제 시 관련 Wishlist 자동 삭제
'''
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from backend.database import Base



class Child(Base):

    __tablename__ = "child"

    ChildID = Column(Integer, primary_key=True, autoincrement=True)
    Name = Column(String, nullable=False)
    Address = Column(String, nullable=False)
    RegionID = Column(Integer, nullable=False)

    StatusCode = Column(String, nullable=False, default="Pending")
    DeliveryStatusCode = Column(String, nullable=False, default="Pending")

    # Child 1명 -> Wishlist N개
    wishlist_items = relationship(
        "Wishlist",
        back_populates="child",
        cascade="all, delete-orphan",   # SQLAlchemy 내부적으로도 삭제
        passive_deletes=True            # DB의 ON DELETE CASCADE 사용
    )


class Wishlist(Base):
    '''
    Wishlist (아이의 선호 선물)
    - ChildID: 삭제 시 CASCADE
    - GiftID : Finished_Goods.gift_id 참조
    '''

    __tablename__ = "wishlist"

    WishlistID = Column(Integer, primary_key=True, autoincrement=True)

    # Child 삭제 시 자동 삭제
    ChildID = Column(
        Integer,
        ForeignKey("child.ChildID", ondelete="CASCADE"),
        nullable=False
    )

    # 선물 ID (Finished_Goods.gift_id)
    GiftID = Column(
        Integer,
        ForeignKey("Finished_Goods.gift_id"),
        nullable=False
    )

    Priority = Column(Integer, nullable=False)

    # 역참조
    child = relationship("Child", back_populates="wishlist_items")