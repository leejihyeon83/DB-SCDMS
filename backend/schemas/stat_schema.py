from pydantic import BaseModel, ConfigDict
from typing import List

# 기존 summary용 스키마 유지
class GiftDemandOut(BaseModel):
    '''
    선물(GiftID)별 총 수요량 Summary 응답 스키마.

    Attributes:
        gift_id (int): Finished_Goods.gift_id
        count (int): 해당 Gift를 원하는 총 아이 수
        p1/p2/p3: 우선순위별 수요량 (summary 용)
    '''
    gift_id: int
    count: int
    p1: int
    p2: int
    p3: int

    model_config = ConfigDict(from_attributes=True)


# priority별 Top3용 스키마
class PriorityTop3(BaseModel):
    '''
    우선순위(Priority)별 Top3 항목.
    '''
    gift_id: int
    gift_name: str
    count: int

    model_config = ConfigDict(from_attributes=True)


class PriorityGroupOut(BaseModel):
    '''
    priority1, priority2, priority3 각각의 Top3를 묶어 반환하는 스키마
    '''
    priority1: List[PriorityTop3]
    priority2: List[PriorityTop3]
    priority3: List[PriorityTop3]

    model_config = ConfigDict(from_attributes=True)
