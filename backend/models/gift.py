from sqlalchemy import Column, Integer, String
from backend.database import Base

class RawMaterial(Base):
    __tablename__ = "Raw_Materials"

    material_id = Column(Integer, primary_key=True, index=True)
    material_name = Column(String, unique=True, nullable=False)
    stock_quantity = Column(Integer, default=0)