from pydantic import BaseModel

# 조회용
class Gift(BaseModel):
    gift_id: int
    gift_name: str
    stock_quantity: int

    class Config:
        orm_mode = True


# 생산 요청용
class ProduceRequest(BaseModel):
    gift_id: int
    produced_quantity: int
