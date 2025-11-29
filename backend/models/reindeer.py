from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from backend.database import Base

class Reindeer(Base):
    __tablename__ = "reindeer"

    reindeer_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)

    # team_name = Column(String, nullable=True)

    current_stamina = Column(Integer, nullable=False, default=100)
    current_magic = Column(Integer, nullable=False, default=100)

    # Ready / Resting / OnDelivery
    status = Column(String, nullable=False, default="Ready")
    # TODO: Santa 배정 로직에서는 status == "Ready" 인 루돌프만 선택하도록 제한
    
class ReindeerHealthLog(Base):
    __tablename__ = "reindeer_health_log"

    log_id = Column(Integer, primary_key=True, index=True)
    reindeer_id = Column(Integer, ForeignKey("reindeer.reindeer_id"), nullable=False)

    log_timestamp = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    notes = Column(Text, nullable=False)
