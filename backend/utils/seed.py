from sqlalchemy import text
from backend.database import SessionLocal
from backend.models.gift import RawMaterial, FinishedGoods, GiftBOM
from backend.models.reindeer import Reindeer
from backend.models.child_status_code import ChildStatusCode
from backend.models.delivery_status_code import DeliveryStatusCode



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
    
def seed_reindeer():
    db = SessionLocal()

    default_reindeers = [
        (1, "빅슨"),
        (2, "도너"),
        (3, "댄서"),
        (4, "큐피드"),
        (5, "대셔"),
        (6, "코멧"),
        (7, "프랜서"),
        (8, "루돌프"),
    ]

    for rid, name in default_reindeers:
        exists = db.query(Reindeer).filter_by(reindeer_id=rid).first()
        if not exists:
            db.add(
                Reindeer(
                    reindeer_id=rid,
                    name=name,
                    current_stamina=100,
                    current_magic=100,
                    status="READY",
                )
            )

    db.commit()
    db.close()
    

def create_ready_reindeer_view():
    """비행 가능 후보 루돌프용 DB VIEW 생성"""
    db = SessionLocal()
    
    # 기존 뷰가 있으면 삭제
    db.execute(text("DROP VIEW IF EXISTS ready_reindeer_view CASCADE;"))
    
    db.execute(text("""
        CREATE OR REPLACE VIEW ready_reindeer_view AS
        SELECT
            reindeer_id,
            name,
            current_stamina,
            current_magic,
            status
        FROM reindeer
        WHERE status = 'READY'
          AND current_stamina >= 70;
    """))
    db.commit()
    db.close()

# 아이 상태 초기값
def seed_child_status_codes():
    db = SessionLocal()
    codes = [
        ("PENDING", "판정 대기"),
        ("NICE", "착한 아이"),
        ("NAUGHTY", "나쁜 아이"),
    ]
    for code, desc in codes:
        if not db.query(ChildStatusCode).filter_by(Code=code).first():
            db.add(ChildStatusCode(Code=code, Description=desc))
    db.commit()
    db.close()


# 배송 상태 초기값
def seed_delivery_status_codes():
    db = SessionLocal()
    codes = [
        ("PENDING", "배송 대기"),
        ("PACKED", "포장 완료"),
        ("READY", "배송 준비 완료"),
        ("DELIVERED", "배송 완료"),
    ]
    for code, desc in codes:
        if not db.query(DeliveryStatusCode).filter_by(Code=code).first():
            db.add(DeliveryStatusCode(Code=code, Description=desc))
    db.commit()
    db.close()