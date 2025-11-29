'''
클라이언트가 보내는 JSON 형식을 검증하는 스키마
- ChildCreate: 아이 + wishlist 여러 개 생성할 때 사용
- WishlistItem: wishlist 안에서 반복되는 구조
'''

from typing import List
from pydantic import BaseModel, Field, validator


# 하나의 wishlist 요소
class WishlistItem(BaseModel):
    gift_id: int = Field(..., description="Finished_Goods의 GiftID")
    priority: int = Field(..., ge=1, description="1이 가장 높은 우선순위")

    class Config:
        from_attributes = True


# 아이 + 위시리스트 동시 생성 시 입력받는 JSON 구조
class ChildCreate(BaseModel):
    name: str
    address: str
    region_id: int
    wishlist: List[WishlistItem]

    # wishlist가 비어있으면 안 됨
    @validator("wishlist")
    def check_not_empty(cls, v):
        if not v:
            raise ValueError("wishlist는 최소 1개 이상 필요합니다.")
        return v

    # priority 중복도 막음
    @validator("wishlist")
    def check_priority_unique(cls, v):
        priorities = [i.priority for i in v]
        if len(priorities) != len(set(priorities)):
            raise ValueError("priority 값이 중복될 수 없습니다.")
        return v


# 응답 형태 정의
class WishlistItemOut(BaseModel):
    wishlist_id: int
    gift_id: int
    priority: int

    class Config:
        from_attributes = True


class ChildOut(BaseModel):
    child_id: int
    name: str
    address: str
    region_id: int
    status_code: str
    delivery_status_code: str
    wishlist: list[WishlistItemOut]

    class Config:
        from_attributes = True
