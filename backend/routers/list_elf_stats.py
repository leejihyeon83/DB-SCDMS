'''
통계 API (List Elf)
-------------------
1) /gift-demand/summary
    ->선물별 총 수요량 + 우선순위별(p1/p2/p3) 분포 요약 API

2) /gift-demand/by-priority
    → Priority = 1/2/3 각각의 Top3 인기 선물 반환 API
'''

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from backend.database import get_db
from backend.models.child import Child, Wishlist
from backend.models.gift import FinishedGoods
from backend.schemas.stat_schema import (
    GiftDemandOut, PriorityTop3, PriorityGroupOut
)

router = APIRouter(
    prefix="/list-elf/stats",
    tags=["List Elf"]
)

# Gift Summary API (기존 /gift-demand -> /gift-demand/summary)

@router.get("/gift-demand/summary", response_model=list[GiftDemandOut])
def get_gift_demand_summary(db: Session = Depends(get_db)):
    '''
    기존 /gift-demand API에서 이름 변경된 버전.
    Nice + Not Delivered 아이들 기준으로
    GiftID별 총 수요량 + Priority별 수요량(p1/p2/p3)을 집계하는 Summary API.
    '''

    # CASE WHEN Priority == X THEN 1 ELSE 0 END
    priority_1 = func.sum(case((Wishlist.Priority == 1, 1), else_=0)).label("p1")
    priority_2 = func.sum(case((Wishlist.Priority == 2, 1), else_=0)).label("p2")
    priority_3 = func.sum(case((Wishlist.Priority == 3, 1), else_=0)).label("p3")

    results = (
        db.query(
            Wishlist.GiftID.label("gift_id"),
            func.count(Wishlist.GiftID).label("total"),
            priority_1,
            priority_2,
            priority_3
        )
        .join(Child, Wishlist.ChildID == Child.ChildID)
        .filter(func.upper(Child.StatusCode) == "NICE")
        .filter(func.upper(Child.DeliveryStatusCode) != "DELIVERED")
        .group_by(Wishlist.GiftID)
        .order_by(func.count(Wishlist.GiftID).desc())
        .all()
    )

    return [
        GiftDemandOut(
            gift_id=row.gift_id,
            count=row.total,
            p1=row.p1,
            p2=row.p2,
            p3=row.p3
        )
        for row in results
    ]


# Priority별 Top3 API (/gift-demand/by-priority)

def get_top3_for_priority(db: Session, priority: int):
    '''
    특정 Priority(1/2/3)에 대해 Top3 선물을 반환하는 내부 함수.
    '''
    rows = (
        db.query(
            Wishlist.GiftID.label("gift_id"),
            FinishedGoods.gift_name.label("gift_name"),
            func.count(Wishlist.GiftID).label("count")
        )
        .join(Child, Wishlist.ChildID == Child.ChildID)
        .join(FinishedGoods, Wishlist.GiftID == FinishedGoods.gift_id)
        .filter(Wishlist.Priority == priority)
        .filter(func.upper(Child.StatusCode) == "NICE")
        .filter(func.upper(Child.DeliveryStatusCode) != "DELIVERED")
        .group_by(Wishlist.GiftID, FinishedGoods.gift_name)
        .order_by(func.count(Wishlist.GiftID).desc())
        .limit(3)
        .all()
    )

    return [
        PriorityTop3(
            gift_id=row.gift_id,
            gift_name=row.gift_name,
            count=row.count
        )
        for row in rows
    ]


@router.get("/gift-demand/by-priority", response_model=PriorityGroupOut)
def get_gift_top3_by_priority(db: Session = Depends(get_db)):
    '''
    Priority = 1/2/3 각각에서 가장 많이 선택된 Top3 선물을 묶어서 반환.
    (예: 가장 많이 1순위로 선택된 선물 Top3 등)
    '''

    return PriorityGroupOut(
        priority1=get_top3_for_priority(db, 1),
        priority2=get_top3_for_priority(db, 2),
        priority3=get_top3_for_priority(db, 3)
    )
