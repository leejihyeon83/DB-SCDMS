from backend.database import SessionLocal
from backend.models.gift import RawMaterial

def seed_raw_materials():
    db = SessionLocal()

    default_materials = [
        (1, "유니콘의털"),
        (2, "별가루"),
        (3, "드래곤비늘"),
        (4, "천사의눈물"),
        (5, "태양조각"),
    ]

    for mid, name in default_materials:
        exists = db.query(RawMaterial).filter_by(material_id=mid).first()
        if not exists:
            db.add(RawMaterial(
                material_id=mid,
                material_name=name,
                stock_quantity=0
            ))

    db.commit()
    db.close()
