from pydantic import BaseModel

class MaterialUpdate(BaseModel):
    material_id: int
    amount: int
