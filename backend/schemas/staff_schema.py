'''
Staff 관련 Pydantic 스키마
- StaffCreate: 운영자 계정 생성용 입력
- StaffOut: API 응답용
'''

from typing import Optional
from pydantic import BaseModel, Field
from pydantic import ConfigDict


class StaffCreate(BaseModel):
    '''
    Staff 계정 생성용 입력 스키마
    '''

    username: str = Field(..., description="로그인용 유저네임 (unique)")
    password: str = Field(..., description="로그인 비밀번호 (단순 문자열)")
    name: str = Field(..., description="표시용 이름")
    role: str = Field(..., description="역할 (ListElf / Santa / GiftElf / Keeper 등)")


class StaffOut(BaseModel):
    '''
    Staff 정보 응답 스키마
    '''

    staff_id: int
    username: str
    name: str
    role: str

    model_config = ConfigDict(from_attributes=True)
