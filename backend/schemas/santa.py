from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict


# ============================
# 생성용 스키마
# ============================
class DeliveryGroupCreate(BaseModel):
    group_name: str
    reindeer_id: int


class DeliveryGroupItemCreate(BaseModel):
    child_id: int
    gift_id: int


# ============================
# 응답용 스키마
# ============================
class DeliveryGroupListItemResponse(BaseModel):
    """
    배송 준비 그룹 목록에서 사용할 요약 정보
    """
    model_config = ConfigDict(from_attributes=True)

    group_id: int
    group_name: str
    reindeer_id: int
    status: str
    child_count: int


class DeliveryGroupItemInGroup(BaseModel):
    """
    그룹 상세 조회 시, 그룹 안에 포함된 아이/선물 한 줄
    """
    model_config = ConfigDict(from_attributes=True)

    group_item_id: int
    child_id: int
    gift_id: int


class DeliveryGroupDetailResponse(BaseModel):
    """
    그룹 상세 조회 응답
    """
    model_config = ConfigDict(from_attributes=True)

    group_id: int
    group_name: str
    reindeer_id: int
    status: str
    created_at: datetime
    created_by_staff_id: int | None = None
    items: List[DeliveryGroupItemInGroup]


# 나중에 배송 로그 조회 API 만들고 싶으면 사용
class DeliveryLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    log_id: int
    child_id: int
    gift_id: int
    delivery_timestamp: datetime
