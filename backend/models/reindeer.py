from sqlalchemy import Column, Integer, String
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
