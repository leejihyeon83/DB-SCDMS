'''
클라이언트가 보내는 JSON 형식을 검증하는 스키마

(주요 기능)
- Child 생성 스키마(ChildCreate)
- Child 수정 스키마(ChildUpdate)
- Wishlist CRUD 스키마(WishlistCreate, WishlistUpdate)
- Child + Wishlist 묶음 출력 스키마(ChildOut, ChildDetailOut)
'''

from typing import List
from pydantic import BaseModel, Field, validator

from typing import List, Optional
from pydantic import BaseModel, Field, validator
from pydantic import ConfigDict


# 1) Wishlist 단일 요소 입력용
class WishlistItem(BaseModel):
    '''
    ChildCreate 시 사용되는 위시리스트 단일 요소.
    '''

    gift_id: int = Field(..., description="Finished_Goods.gift_id")
    priority: int = Field(..., ge=1, description="우선순위 (1이 가장 높음)")

    model_config = ConfigDict(from_attributes=True)


# 2) Child + Wishlist 동시 생성 시 사용
class ChildCreate(BaseModel):
    '''
    Child와 wishlist 여러 개를 한 번에 생성.
    '''

    name: str
    address: str
    region_id: int
    wishlist: List[WishlistItem]

    @validator("wishlist")
    def validate_not_empty(cls, v):
        if not v:
            raise ValueError("wishlist는 최소 1개 이상 필요합니다.")
        return v

    @validator("wishlist")
    def validate_priority_unique(cls, v):
        priorities = [i.priority for i in v]
        if len(priorities) != len(set(priorities)):
            raise ValueError("priority 값이 중복될 수 없습니다.")
        return v


# 3) Child 수정용 스키마
class ChildUpdate(BaseModel):
    '''
    Child 기본 정보 수정용 스키마
    '''

    name: Optional[str] = None
    address: Optional[str] = None
    region_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


# 4) Wishlist CRUD 입력 스키마
class WishlistCreate(BaseModel):
    '''
    Wishlist 항목 생성
    '''
    gift_id: int
    priority: int


class WishlistUpdate(BaseModel):
    '''
    Wishlist 항목 수정
    '''
    gift_id: Optional[int] = None
    priority: Optional[int] = None


# 5) 출력용 스키마
class WishlistItemOut(BaseModel):
    '''
    서버 응답용 wishlist item
    '''

    wishlist_id: int
    gift_id: int
    priority: int

    model_config = ConfigDict(from_attributes=True)


class ChildOut(BaseModel):
    '''
    Child 생성/수정 후 반환 구조
    '''

    child_id: int
    name: str
    address: str
    region_id: int
    status_code: str
    delivery_status_code: str
    wishlist: List[WishlistItemOut]

    model_config = ConfigDict(from_attributes=True)


# Child + Wishlist 묶음 상세 조회
class ChildDetailOut(BaseModel):
    '''
    GET /child/{id}/details 출력 스키마
    '''

    child_id: int
    name: str
    address: str
    region_id: int
    status_code: str
    delivery_status_code: str
    wishlist: List[WishlistItemOut]

    model_config = ConfigDict(from_attributes=True)