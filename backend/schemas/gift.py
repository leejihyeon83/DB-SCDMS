from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# 원자재 채굴 요청 바디
class MaterialUpdate(BaseModel):
    material_id: int
    amount: int

# 선물 재고 조회 응답 스키마
class Gift(BaseModel):
    gift_id: int
    gift_name: str
    stock_quantity: int

    class Config:
        from_attributes = True

# 선물 생산 요청 바디
class ProduceRequest(BaseModel):
    gift_id: int
    produced_quantity: int
    
# 선물 레시피 응답 스키마
class GiftRecipeItem(BaseModel):
    material_id: int
    material_name: str
    quantity_required: int

    class Config:
        from_attributes = True
        
# 생산 Job 생성 요청 바디
class ProductionCreateRequest(BaseModel):
    gift_id: int
    produced_quantity: int
    staff_id: int
    
# 생산 로그 응답 스키마
class ProductionLogResponse(BaseModel):
    job_id: int
    gift_id: int
    quantity_produced: int
    produced_by_staff_id: int
    timestamp: datetime

    class Config:
        from_attributes = True