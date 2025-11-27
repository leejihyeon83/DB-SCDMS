from backend.database import SessionLocal
from backend.models.gift import FinishedGoods

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
