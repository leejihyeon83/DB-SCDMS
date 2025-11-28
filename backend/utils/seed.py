from backend.database import SessionLocal
from backend.models.gift import RawMaterial, FinishedGoods

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

def seed_finished_goods():
    db = SessionLocal()

    default_gifts = [
        (1, "게임기"),
        (2, "모자"),
        (3, "가방"),
        (4, "인형"),
        (5, "책"),
    ]

    for gid, name in default_gifts:
        exists = db.query(FinishedGoods).filter_by(gift_id=gid).first()

        if not exists:
            db.add(FinishedGoods(
                gift_id=gid,
                gift_name=name,
                stock_quantity=0
            ))
            
    db.commit()
    db.close()