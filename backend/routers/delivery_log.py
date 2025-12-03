from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db, get_authorized_db
from backend.models.delivery_log import DeliveryLog
from backend.models.child import Child
from backend.models.gift import FinishedGoods
from backend.schemas.delivery_log import DeliveryLogListItemResponse

router = APIRouter(
    prefix="/delivery-log",
    tags=["DeliveryLog"],
)


@router.get("/", response_model=List[DeliveryLogListItemResponse])
def list_delivery_logs(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_authorized_db),
):
    """
    배송 로그 목록 조회

    - 최신 순 정렬 (delivery_timestamp DESC)
    - 기본 100개, offset/limit 간단 페이지네이션
    """

    query = (
        db.query(
            DeliveryLog.log_id,
            DeliveryLog.child_id,
            Child.Name.label("child_name"),
            DeliveryLog.gift_id,
            FinishedGoods.gift_name.label("gift_name"),
            DeliveryLog.delivered_by_staff_id,
            DeliveryLog.delivery_timestamp,
        )
        .join(Child, DeliveryLog.child_id == Child.ChildID)
        .join(FinishedGoods, DeliveryLog.gift_id == FinishedGoods.gift_id)
        .distinct(
            DeliveryLog.log_id
        )
        .order_by(
            DeliveryLog.log_id,
            DeliveryLog.delivery_timestamp.desc() 
        )
        .offset(offset)
        .limit(limit)
    )

    rows = query.all()

    # row는 namedtuple 비슷한 형태라 속성으로 접근 가능
    return [
        DeliveryLogListItemResponse(
            log_id=row.log_id,
            child_id=row.child_id,
            child_name=row.child_name,
            gift_id=row.gift_id,
            gift_name=row.gift_name,
            delivered_by_staff_id=row.delivered_by_staff_id,
            delivery_timestamp=row.delivery_timestamp,
        )
        for row in rows
    ]
