from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from backend.database import Base


class Rule(Base):
    __tablename__ = "rules"

    RuleID = Column(Integer, primary_key=True, autoincrement=True)

    # 규칙 제목 (예: '출석 기준', '교사 평가 기준')
    Title = Column(String, nullable=False)

    # 사람이 읽는 상세 기준 설명
    Description = Column(Text, nullable=False)

    # 누가 생성했는지 (Staff FK)
    CreatedBy_StaffID = Column(
        Integer,
        ForeignKey("staff.StaffID"),
        nullable=False,
    )

    # 마지막으로 누가 수정했는지
    UpdatedBy_StaffID = Column(
        Integer,
        ForeignKey("staff.StaffID"),
        nullable=True,
    )

    # 생성/수정 시간 기록
    CreatedAt = Column(DateTime, server_default=func.now(), nullable=False)
    UpdatedAt = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # 관계 설정
    created_by = relationship("Staff", foreign_keys=[CreatedBy_StaffID], lazy="joined")
    updated_by = relationship("Staff", foreign_keys=[UpdatedBy_StaffID], lazy="joined")
