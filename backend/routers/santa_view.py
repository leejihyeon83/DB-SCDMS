'''
Santa View API
--------------
Santa가 보는 '배송 대상 아이' 전용 조회 API.

조건:
- StatusCode == "NICE"
- DeliveryStatusCode != "DELIVERED"
- (선택) region_id로 지역 필터링
'''

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db, get_authorized_db
from backend.models.child import Child, Wishlist
from backend.models.gift import FinishedGoods
from backend.schemas.santa_schema import (
    SantaTargetOut,
    SantaTargetDetailOut,
)
from backend.schemas.child_schema import WishlistItemOut

router = APIRouter(
    prefix="/santa",
    tags=["Santa"],
)


@router.get("/targets", response_model=list[SantaTargetOut])
def get_santa_targets(
    region_id: int | None = None,
    db: Session = Depends(get_authorized_db),
):
    '''
    배송 대상 아이 전체 조회 API

    필터:
    - NICE 상태
    - 아직 DELIVERED 아님
    - (선택) region_id로 지역 필터링
    '''

    query = (
        db.query(Child)
        .filter(func.upper(Child.StatusCode) == "NICE")
        .filter(func.upper(Child.DeliveryStatusCode) != "DELIVERED")
    )

    if region_id is not None:
        query = query.filter(Child.RegionID == region_id)

    children = query.all()

    return [
        SantaTargetOut(
            child_id=c.ChildID,
            name=c.Name,
            address=c.Address,
            region_id=c.RegionID,
            region_name=c.region.RegionName if getattr(c, "region", None) else None,
            status_code=c.StatusCode,
            delivery_status_code=c.DeliveryStatusCode,
        )
        for c in children
    ]


@router.get("/targets/{child_id}", response_model=SantaTargetDetailOut)
def get_santa_target_detail(
    child_id: int,
    db: Session = Depends(get_authorized_db),
):
    '''
    배송 대상 아이 1명 상세 조회 API

    - NICE + !DELIVERED 조건을 만족하는 아이만 조회 가능
    - 그렇지 않으면 404
    '''

    child = (
        db.query(Child)
        .filter(Child.ChildID == child_id)
        .filter(func.upper(Child.StatusCode) == "NICE")
        .filter(func.upper(Child.DeliveryStatusCode) != "DELIVERED")
        .first()
    )

    if not child:
        raise HTTPException(status_code=404, detail="Santa target not found")

    return SantaTargetDetailOut(
        child_id=child.ChildID,
        name=child.Name,
        address=child.Address,
        region_id=child.RegionID,
        region_name=child.region.RegionName if getattr(child, "region", None) else None,
        status_code=child.StatusCode,
        delivery_status_code=child.DeliveryStatusCode,
        child_note=child.ChildNote,
        wishlist=[
            WishlistItemOut(
                wishlist_id=w.WishlistID,
                gift_id=w.GiftID,
                priority=w.Priority,
            )
            for w in child.wishlist_items
        ],
    )

@router.get("/assign-gifts")
def assign_gifts(
    region_id: int | None = None,
    db: Session = Depends(get_authorized_db),
):
    """
    배송 대상 아이별 자동 선물 선정 API

    규칙:
    - Status = NICE
    - DeliveryStatus = PENDING
    - (optional) region_id 필터링
    - wishlist를 priority ASC로 정렬
    - 첫 번째로 재고가 있는 선물 선택
    - 재고 없으면 child 제외
    """

    # 1) 배송 대상 Child 조회
    query = (
        db.query(Child)
        .filter(func.upper(Child.StatusCode) == "NICE")
        .filter(func.upper(Child.DeliveryStatusCode) == "PENDING")
    )

    if region_id is not None:
        query = query.filter(Child.RegionID == region_id)

    children = query.all()

    result = []

    # 2) 각 Child의 wishlist에서 선물 선택
    for child in children:
        wishlist_items = (
            db.query(Wishlist)
            .filter(Wishlist.ChildID == child.ChildID)
            .order_by(Wishlist.Priority.asc())   # priority ASC 정렬
            .all()
        )

        selected_gift_id = None

        # 3) wishlist에서 첫 번째 재고 있는 gift 찾기
        for w in wishlist_items:
            stock = (
                db.query(FinishedGoods.stock_quantity)
                .filter(FinishedGoods.gift_id == w.GiftID)
                .scalar()
            )

            # 재고 있는 gift 발견 → 바로 선택
            if stock and stock > 0:
                selected_gift_id = w.GiftID
                break

        # 4) 재고가 있는 선물이 있는 경우만 결과에 추가
        if selected_gift_id is not None:
            result.append({
                "child_id": child.ChildID,
                "gift_id": selected_gift_id
            })

    return result