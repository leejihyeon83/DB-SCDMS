from datetime import datetime
from pydantic import BaseModel


class DeliveryLogListItemResponse(BaseModel):
    """
    배송 로그 1건에 대한 응답 형식
    """
    log_id: int

    child_id: int
    child_name: str

    gift_id: int
    gift_name: str

    delivered_by_staff_id: int | None = None

    delivery_timestamp: datetime
