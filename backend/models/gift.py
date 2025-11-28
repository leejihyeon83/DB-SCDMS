from sqlalchemy import Column, Integer, String
from backend.database import Base

class FinishedGoods(Base):
    __tablename__ = "Finished_Goods"

    gift_id = Column(Integer, primary_key=True, index=True)
    gift_name = Column(String, nullable=False)
    stock_quantity = Column(Integer, default=0)
    
class RawMaterial(Base):
    __tablename__ = "Raw_Materials"

    material_id = Column(Integer, primary_key=True, index=True)
    material_name = Column(String, unique=True, nullable=False)
    stock_quantity = Column(Integer, default=0)
