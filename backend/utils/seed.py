from backend.database import SessionLocal
from backend.models.gift import RawMaterial, FinishedGoods, GiftBOM

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
    
def seed_gift_bom():
    db = SessionLocal()

    default_boms = [
        (1, 1, 3, 2),  # 게임기 = 드래곤비늘 2
        (2, 1, 2, 1),  #        + 별가루 1
        (3, 1, 5, 1),  #        + 태양조각 1
        (4, 2, 1, 3),  # 모자 = 유니콘털 3
        (5, 2, 4, 1),  #      + 천사눈물 1
        (6, 3, 1, 1),  # 가방 = 유니콘털 1
        (7, 3, 2, 1),  #      + 별가루 1
        (8, 3, 3, 1),  #      + 드래곤비늘 1
        (9, 4, 2, 2),  # 인형 = 별가루 2
        (10,4, 4, 1),  #      + 천사눈물 1
        (11,5, 2, 1),  # 책 = 별가루 1
        (12,5, 4, 1),  #    + 천사눈물 1
        (13,5, 5, 2),  #    + 태양조각 2
    ]

    for bom_id, out_id, in_mat, qty in default_boms:
        exists = (
            db.query(GiftBOM)
              .filter_by(output_gift_id=out_id,
                         input_material_id=in_mat)
              .first()
        )
        if not exists:
            db.add(
                GiftBOM(
                    bom_id=bom_id,
                    output_gift_id=out_id,
                    input_material_id=in_mat,
                    quantity_required=qty,
                )
            )

    db.commit()
    db.close()