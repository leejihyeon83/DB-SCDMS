'''
Santa View용 Pydantic 스키마

- SantaTargetOut: 배송 대상 아이 리스트용 (기본 정보만)
- SantaTargetDetailOut: 아이 1명 상세 + wishlist + child_note
'''

from typing import List, Optional
from pydantic import BaseModel
from pydantic import ConfigDict

from backend.schemas.child_schema import WishlistItemOut


class SantaTargetOut(BaseModel):
    '''
    GET /santa/targets 응답용
    배송 대상 아이의 기본 정보 + 지역 정보
    '''

    child_id: int
    name: str
    address: str
    region_id: int
    region_name: Optional[str] = None
    status_code: str
    delivery_status_code: str

    model_config = ConfigDict(from_attributes=True)


class SantaTargetDetailOut(BaseModel):
    '''
    GET /santa/targets/{child_id} 응답용
    - 기본 정보 + child_note + wishlist 포함
    '''

    child_id: int
    name: str
    address: str
    region_id: int
    region_name: Optional[str] = None
    status_code: str
    delivery_status_code: str
    child_note: Optional[str] = None
    wishlist: List[WishlistItemOut]

    model_config = ConfigDict(from_attributes=True)
