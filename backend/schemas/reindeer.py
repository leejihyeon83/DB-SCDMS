from datetime import datetime
from pydantic import BaseModel, field_validator

# 공통 필드 (조회/응답용)
class ReindeerBase(BaseModel):
    name: str
    # team_name: str | None = None
    current_stamina: int = 100
    current_magic: int = 100
    status: str = "Ready"  # Ready / Resting / OnDelivery

    # 상태 검증
    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = {"Ready", "Resting", "OnDelivery"}
        if v not in allowed:
            raise ValueError(f"status must be one of {allowed}")
        return v


# 조회 응답용 스키마
class ReindeerResponse(ReindeerBase):
    reindeer_id: int

    class Config:
        from_attributes = True


# 상태만 바꿀 때 쓸 스키마
class ReindeerUpdateStatus(BaseModel):
    reindeer_id: int
    status: str  # Ready / Resting / OnDelivery
    current_stamina: int
    current_magic: int

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = {"Ready", "Resting", "OnDelivery"}
        if v not in allowed:
            raise ValueError(f"status must be one of {allowed}")
        return v
    
    @field_validator("current_stamina", "current_magic")
    @classmethod
    def non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("stamina/magic must be >= 0")
        return v

class HealthLogCreate(BaseModel):
    reindeer_id: int
    notes: str  # Keeper가 남기는 메모


class HealthLogResponse(BaseModel):
    log_id: int
    reindeer_id: int
    log_timestamp: datetime
    notes: str

    class Config:
        from_attributes = True