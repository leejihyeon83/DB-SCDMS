from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.database import Base

class RawMaterial(Base):
    __tablename__ = "Raw_Materials"

    material_id = Column(Integer, primary_key=True, index=True)
    material_name = Column(String, unique=True, nullable=False)
    stock_quantity = Column(Integer, default=0)
    
    # GiftBOM에서 재료 역관계 참조 -> 재료가 어디 레시피에 쓰이는지 보고 싶을 때
    boms = relationship("GiftBOM", back_populates="input_material")

class FinishedGoods(Base):
    __tablename__ = "Finished_Goods"

    gift_id = Column(Integer, primary_key=True, index=True)
    gift_name = Column(String, nullable=False)
    stock_quantity = Column(Integer, default=0)
    
    # GiftBOM에서 선물 역관계 참조 -> 선물을 만들 때 쓰이는 레시피가 보고 싶을 때
    boms = relationship("GiftBOM", back_populates="output_gift")
    
class GiftBOM(Base):
    __tablename__ = "gift_bom"

    bom_id = Column(Integer, primary_key=True, index=True)
    output_gift_id = Column(Integer, ForeignKey("Finished_Goods.gift_id"), nullable=False)
    input_material_id = Column(Integer, ForeignKey("Raw_Materials.material_id"), nullable=False)
    quantity_required = Column(Integer, nullable=False)

    __table_args__ = (
        UniqueConstraint("output_gift_id", "input_material_id"),
    )

    output_gift = relationship("FinishedGoods", back_populates="boms")
    input_material = relationship("RawMaterial", back_populates="boms")