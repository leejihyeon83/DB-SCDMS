from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from backend.database import Base


class Region(Base):
    __tablename__ = "regions"

    # 기본 키
    RegionID = Column(Integer, primary_key=True, autoincrement=True)
    RegionName = Column(String, nullable=False)

    # Child와 1:N 관계
    children = relationship("Child", back_populates="region")
