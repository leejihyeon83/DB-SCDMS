from sqlalchemy import text
from backend.database import SessionLocal
from backend.models.gift import RawMaterial, FinishedGoods, GiftBOM
from backend.models.reindeer import Reindeer
from backend.models.child_status_code import ChildStatusCode
from backend.models.delivery_status_code import DeliveryStatusCode
from backend.models.staff import Staff 
from backend.models.child import Child, Wishlist

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
                    status="Ready",
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
        WHERE status = 'Ready'
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

def seed_staff():
    '''
    초기 Staff 계정 더미 데이터
    - 테스트/Swagger용 기본 계정들
    '''
    db = SessionLocal()

    default_staff = [
        ("yebin", "1234", "조예빈", "ListElf"),
        ("santa", "1234", "Santa Claus", "Santa"),
    ]

    for username, password, name, role in default_staff:
        exists = db.query(Staff).filter_by(Username=username).first()
        if not exists:
            db.add(
                Staff(
                    Username=username,
                    Password=password,
                    Name=name,
                    Role=role,
                )
            )

    db.commit()
    db.close()

def seed_child():
    """
    Child + Wishlist 더미데이터 자동 생성
    - Name 기준 중복 체크
    - StatusCode / DeliveryStatusCode / ChildNote 값까지 포함
    """
    db = SessionLocal()

    dummy_children = [
        {
            "name": "Alice",
            "address": "123 Snow Road",
            "region_id": 1,
            "status_code": "NICE",
            "delivery_status_code": "PENDING",
            "child_note": "착한 행동을 많이 함",
            "wishlist": [
                {"gift_id": 1, "priority": 1},
                {"gift_id": 3, "priority": 2},
            ],
        },
        {
            "name": "Bob",
            "address": "45 Reindeer Ave",
            "region_id": 2,
            "status_code": "NICE",
            "delivery_status_code": "READY",
            "child_note": "학교에서 우수한 성적",
            "wishlist": [
                {"gift_id": 2, "priority": 1},
                {"gift_id": 4, "priority": 2},
                {"gift_id": 1, "priority": 3},
            ],
        },
        {
            "name": "Charlie",
            "address": "99 Polar Bear St",
            "region_id": 3,
            "status_code": "NAUGHTY",
            "delivery_status_code": "PENDING",
            "child_note": "조금 말썽이지만 개선 중",
            "wishlist": [
                {"gift_id": 5, "priority": 1},
            ],
        },
    ]

    for child_data in dummy_children:
        # 이미 같은 name의 Child가 있으면 Skip
        exists = db.query(Child).filter(Child.Name == child_data["name"]).first()
        if exists:
            continue

        # Child 생성
        child = Child(
            Name=child_data["name"],
            Address=child_data["address"],
            RegionID=child_data["region_id"],
            StatusCode=child_data["status_code"],
            DeliveryStatusCode=child_data["delivery_status_code"],
            ChildNote=child_data["child_note"],
        )
        db.add(child)
        db.flush()  # ChildID 확보

        # Wishlist 생성
        for w in child_data["wishlist"]:
            # 존재하는 gift_id인지 확인
            gift_exists = db.query(FinishedGoods).filter(
                FinishedGoods.gift_id == w["gift_id"]
            ).first()
            if not gift_exists:
                continue  # Finished_Goods seed에서 gift 없으면 skip

            wishlist_item = Wishlist(
                ChildID=child.ChildID,
                GiftID=w["gift_id"],
                Priority=w["priority"],
            )
            db.add(wishlist_item)

    db.commit()
    db.close()