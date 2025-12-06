from pydantic import BaseModel, ConfigDict

class StatusCodeBase(BaseModel):
    # API 입출력에서 쓸 필드 이름 (소문자)
    code: str
    description: str


class StatusCodeCreate(StatusCodeBase):
    """
    상태 코드 생성 요청 바디
    - code: "Nice", "Naughty", "Pending", "Delivered", "SPECIAL" 등
    - description: 한국어/설명용 텍스트
    """
    pass


class StatusCodeUpdate(BaseModel):
    """
    상태 코드 수정 요청 바디
    - description만 수정 (code는 PK라 고정)
    """
    description: str


class StatusCodeOut(StatusCodeBase):
    """
    상태 코드 조회 응답
    - SQLAlchemy 모델의 Code / Description 필드를
      API 응답용 code / description으로 변환
    """

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm(cls, obj):
        code_value = getattr(obj, "Code", None)
        if code_value is None:
            # 혹시 다른 이름을 쓸 수도 있으니 방어 코드
            code_value = getattr(obj, "StatusCode", None)

        if code_value is None:
            raise ValueError("StatusCodeOut.from_orm: code 필드를 찾을 수 없습니다.")

        desc_value = getattr(obj, "Description", "")

        return cls(code=code_value, description=desc_value)
