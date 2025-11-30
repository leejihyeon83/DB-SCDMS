'''
Rules 관련 Pydantic 스키마
- RuleCreate: 규칙 생성
- RuleUpdate: 규칙 수정
- RuleOut: 규칙 조회용 응답
'''

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from pydantic import ConfigDict


class RuleCreate(BaseModel):
    '''
    Rule 생성용 스키마
    - created_by_staff_id 는 현재 로그인한 StaffID를 프론트에서 넘긴다고 가정
    '''

    title: str = Field(..., description="규칙 제목")
    description: str = Field(..., description="규칙 상세 설명 (사람이 읽는 텍스트)")
    created_by_staff_id: int = Field(..., description="규칙을 생성한 StaffID")


class RuleUpdate(BaseModel):
    '''
    Rule 수정용 스키마
    - title/description 둘 중 일부만 수정 가능
    - updated_by_staff_id 는 수정한 StaffID
    '''

    title: Optional[str] = Field(None, description="규칙 제목")
    description: Optional[str] = Field(None, description="규칙 상세 설명")
    updated_by_staff_id: Optional[int] = Field(
        None, description="규칙을 수정한 StaffID"
    )


class RuleOut(BaseModel):
    '''
    Rule 응답 스키마
    '''

    rule_id: int
    title: str
    description: str
    created_by_staff_id: int
    updated_by_staff_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
