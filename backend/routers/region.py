from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db, get_authorized_db
from backend.models.region import Region

router = APIRouter(prefix="/regions", tags=["Regions"])

@router.get("/all")
def get_all_regions(db: Session = Depends(get_authorized_db)):
    regions = db.query(Region).all()
    return [
        {
            "RegionID": r.RegionID,
            "RegionName": r.RegionName
        }
        for r in regions
    ]
