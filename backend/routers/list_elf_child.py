'''
아이(Child) + Wishlist를 한 번에 생성하는 API
- Child INSERT
- Wishlist 여러 개 INSERT
- 중간에 실패하면 전부 롤백 (트랜잭션 처리)
- Child 수정 (PATCH)
- Child 삭제 (DELETE)
- Child 상세 조회 (Child + Wishlist)
- Wishlist 생성
- Wishlist 수정
- Wishlist 삭제
'''
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.child import Child, Wishlist
from backend.models.gift import FinishedGoods
from backend.schemas.child_schema import (
    ChildCreate, ChildUpdate,
    ChildOut, ChildDetailOut,
    WishlistCreate, WishlistUpdate,
    WishlistItemOut
)
from sqlalchemy import func


router = APIRouter(
    prefix="/list-elf/child",
    tags=["List Elf"]
)

@router.post("/create", response_model=ChildOut, status_code=status.HTTP_201_CREATED)
def create_child_with_wishlist(payload: ChildCreate, db: Session = Depends(get_db)):
    '''
    Child와 Wishlist를 한 요청에서 생성하는 API
    '''

    # priority 중복 최종 체크 (스키마에서 한 번 걸러도 서버에서 다시 체크)
    priorities = [item.priority for item in payload.wishlist]
    if len(priorities) != len(set(priorities)):
        raise HTTPException(status_code=400, detail="priority가 중복됩니다.")

    # 실제 DB에 존재하는 GiftID인지 검사
    gift_ids = {item.gift_id for item in payload.wishlist}
    existing_gifts = (
    db.query(FinishedGoods)
      .filter(FinishedGoods.gift_id.in_(gift_ids))
      .all()
    )
    existing_ids = {g.gift_id for g in existing_gifts}

    missing = gift_ids - existing_ids
    if missing:
        raise HTTPException(status_code=400, detail=f"존재하지 않는 GiftID: {missing}")

    try:
        # Child INSERT
        child = Child(
            Name=payload.name,
            Address=payload.address,
            RegionID=payload.region_id,
            StatusCode=(payload.status_code or "PENDING").upper(), # 기본 상태
            DeliveryStatusCode=(payload.delivery_status_code or "PENDING").upper(), # 기본 배송 상태
            ChildNote=payload.child_note
        )

        db.add(child)
        db.flush()  # ChildID 확보 (commit 전이지만 FK에 사용 가능)

        # Wishlist 여러 개 INSERT
        wishlist_rows = []
        for item in payload.wishlist:
            w = Wishlist(
                ChildID=child.ChildID,   # 방금 생성한 Child와 연결
                GiftID=item.gift_id,
                Priority=item.priority,
            )
            db.add(w)
            wishlist_rows.append(w)

        db.commit()  # 모든 INSERT 성공하면 commit

    # except Exception:
    #     db.rollback()  # 하나라도 실패하면 전부 취소
    #     raise HTTPException(status_code=500, detail="데이터 생성 중 오류 발생")

    except Exception as e: # 정확한 오류를 찾기 위해 사용 
        db.rollback()
        print("ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


    # 응답 데이터 형태 맞추기
    return ChildOut(
        child_id=child.ChildID,
        name=child.Name,
        address=child.Address,
        region_id=child.RegionID,
        status_code=child.StatusCode,
        delivery_status_code=child.DeliveryStatusCode,
        child_note=payload.child_note,
        wishlist=[
            WishlistItemOut(
                wishlist_id=w.WishlistID,
                gift_id=w.GiftID,
                priority=w.Priority
            )
            for w in wishlist_rows
        ]
    )

# Child 수정 (PATCH)
@router.patch("/{child_id}", response_model=ChildOut)
def update_child(child_id: int, payload: ChildUpdate, db: Session = Depends(get_db)):
    """
    Child 기본 정보 수정
    """

    child = db.query(Child).filter(Child.ChildID == child_id).first()
    if not child:
        raise HTTPException(404, "Child not found")

    update_data = payload.dict(exclude_unset=True)

    for key, value in update_data.items():

        # status_code → StatusCode
        if key == "status_code":
            setattr(child, "StatusCode", value.upper())

        # delivery_status_code → DeliveryStatusCode
        elif key == "delivery_status_code":
            setattr(child, "DeliveryStatusCode", value.upper())

        # child_note → ChildNote
        elif key == "child_note":
            setattr(child, "ChildNote", value)

        # 기본 필드(Name, Address, RegionID)는 capitalize 적용
        else:
            setattr(child, key.capitalize(), value)

    db.commit()
    db.refresh(child)

    return ChildOut(
        child_id=child.ChildID,
        name=child.Name,
        address=child.Address,
        region_id=child.RegionID,
        status_code=child.StatusCode,
        delivery_status_code=child.DeliveryStatusCode,
        child_note=child.ChildNote,
        wishlist=[
            WishlistItemOut(
                wishlist_id=w.WishlistID,
                gift_id=w.GiftID,
                priority=w.Priority
            )
            for w in child.wishlist_items
        ]
    )


# Child 삭제 (DELETE)
@router.delete("/{child_id}")
def delete_child(child_id: int, db: Session = Depends(get_db)):
    '''
    Child 삭제
    - wishlist는 CASCADE로 자동 삭제됨
    '''

    child = db.query(Child).filter(Child.ChildID == child_id).first()
    if not child:
        raise HTTPException(404, "Child not found")

    db.delete(child)
    db.commit()

    return {"message": "Child and wishlist deleted successfully"}


# Child 상세 조회 (Child + Wishlist)
@router.get("/{child_id}/details", response_model=ChildDetailOut)
def get_child_details(child_id: int, db: Session = Depends(get_db)):
    '''
    Child + Wishlist 묶음 조회
    UI/UX 화면에서 '아이 상세 페이지'를 만들 때 필수
    '''

    child = db.query(Child).filter(Child.ChildID == child_id).first()
    if not child:
        raise HTTPException(404, "Child not found")

    return ChildDetailOut(
        child_id=child.ChildID,
        name=child.Name,
        address=child.Address,
        region_id=child.RegionID,
        status_code=child.StatusCode,
        delivery_status_code=child.DeliveryStatusCode,
        wishlist=[
            WishlistItemOut(
                wishlist_id=w.WishlistID,
                gift_id=w.GiftID,
                priority=w.Priority,
            )
            for w in child.wishlist_items
        ]
    )


# Wishlist 생성
@router.post("/{child_id}/wishlist", response_model=WishlistItemOut)
def add_wishlist(child_id: int, payload: WishlistCreate, db: Session = Depends(get_db)):
    '''
    Child에 Wishlist 항목 추가
    '''

    child = db.query(Child).filter(Child.ChildID == child_id).first()
    if not child:
        raise HTTPException(404, "Child not found")

    gift = db.query(FinishedGoods).filter(FinishedGoods.gift_id == payload.gift_id).first()
    if not gift:
        raise HTTPException(404, "Gift not found")

    wishlist = Wishlist(
        ChildID=child_id,
        GiftID=payload.gift_id,
        Priority=payload.priority
    )

    db.add(wishlist)
    db.commit()
    db.refresh(wishlist)

    return WishlistItemOut(
        wishlist_id=wishlist.WishlistID,
        gift_id=wishlist.GiftID,
        priority=wishlist.Priority
    )


# Wishlist 수정
@router.patch("/wishlist/{wishlist_id}", response_model=WishlistItemOut)
def update_wishlist(wishlist_id: int, payload: WishlistUpdate, db: Session = Depends(get_db)):
    """
    Wishlist 항목 단일 수정
    """

    wishlist = db.query(Wishlist).filter(Wishlist.WishlistID == wishlist_id).first()
    if not wishlist:
        raise HTTPException(404, "Wishlist item not found")

    data = payload.dict(exclude_unset=True)

    # gift_id 수정 시 유효한 Gift인지 확인
    if "gift_id" in data:
        gift = db.query(FinishedGoods).filter(FinishedGoods.gift_id == data["gift_id"]).first()
        if not gift:
            raise HTTPException(404, "Gift not found")

    # 필드 매핑 정확히 처리
    for key, value in data.items():
        if key == "gift_id":
            setattr(wishlist, "GiftID", value)
        elif key == "priority":
            setattr(wishlist, "Priority", value)

    db.commit()
    db.refresh(wishlist)

    return WishlistItemOut(
        wishlist_id=wishlist.WishlistID,
        gift_id=wishlist.GiftID,
        priority=wishlist.Priority
    )


# Wishlist 삭제
@router.delete("/wishlist/{wishlist_id}")
def delete_wishlist(wishlist_id: int, db: Session = Depends(get_db)):
    '''
    Wishlist 항목 단일 삭제
    '''

    wishlist = db.query(Wishlist).filter(Wishlist.WishlistID == wishlist_id).first()
    if not wishlist:
        raise HTTPException(404, "Wishlist item not found")

    db.delete(wishlist)
    db.commit()

    return {"message": "Wishlist item deleted successfully"}

