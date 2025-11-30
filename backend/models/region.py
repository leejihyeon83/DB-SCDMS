"""
Region Model
------------
아이(Child)가 속한 지역 정보를 관리하는 테이블.

예시 Seed:
1: South Korea
2: North America
3: Europe
...
"""

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
