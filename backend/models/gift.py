from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base

class RawMaterial(Base):
    __tablename__ = "Raw_Materials"

    material_id = Column(Integer, primary_key=True, index=True)
    material_name = Column(String, unique=True, nullable=False)
    stock_quantity = Column(Integer, default=0)
    
    # GiftBOM에서 재료 역관계 참조 -> 재료가 어디 레시피에 쓰이는지 보고 싶을 때
    boms = relationship("GiftBOM", back_populates="input_material")
    
    # 이 재료가 어떤 생산 Job들에서 얼마나 사용됐는지 보고 싶을 때
    production_usages = relationship("ProductionUsage", back_populates="material")

class FinishedGoods(Base):
    __tablename__ = "Finished_Goods"

    gift_id = Column(Integer, primary_key=True, index=True)
    gift_name = Column(String, nullable=False)
    stock_quantity = Column(Integer, default=0)
    
    # GiftBOM에서 선물 역관계 참조 -> 선물을 만들 때 쓰이는 레시피가 보고 싶을 때
    boms = relationship("GiftBOM", back_populates="output_gift")
    
    # 생산 로그 목록을 보고 싶을 때
    production_logs = relationship("ProductionLog", back_populates="gift")
    
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
    
class ProductionLog(Base):
    __tablename__ = "Production_Log"

    job_id = Column(Integer, primary_key=True, index=True)

    # 어떤 선물을 생산했는지
    gift_id = Column(
        Integer,
        ForeignKey("Finished_Goods.gift_id"),
        nullable=False,
    )

    # 몇 개를 생산했는지
    quantity_produced = Column(Integer, nullable=False)

    # 누가 생산했는지(스태프/사용자 ID)
    produced_by_staff_id = Column(
        Integer,
        # ForeignKey("Staff.StaffID"),  # 나중에 Staff 테이블 생성했을 때 추가
        nullable=False,
    )

    # 언제 생산했는지
    timestamp = Column(
        DateTime(timezone=True),
        server_default=func.now(),   # INSERT 시 자동으로 현재 시간
        nullable=False,
    )

    gift = relationship("FinishedGoods", back_populates="production_logs")
    # staff = relationship("Staff", back_populates="production_logs")  # 나중에 Staff 테이블 생성했을 때 추가
    
    # 이번 생산 Job에서 사용된 재료 목록
    usages = relationship("ProductionUsage", back_populates="job")
    
class ProductionUsage(Base):
    __tablename__ = "Production_Usage"

    # 어떤 생산 Job에서
    job_id = Column(
        Integer,
        ForeignKey("Production_Log.job_id"),
        primary_key=True,
    )

    # 어떤 재료를
    material_id = Column(
        Integer,
        ForeignKey("Raw_Materials.material_id"),
        primary_key=True,
    )

    # 얼마나 사용했는지
    quantity_used = Column(Integer, nullable=False)

    job = relationship("ProductionLog", back_populates="usages")
    material = relationship("RawMaterial", back_populates="production_usages")