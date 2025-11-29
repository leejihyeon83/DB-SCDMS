'''
아이(Child) + Wishlist를 한 번에 생성하는 API
- Child INSERT
- Wishlist 여러 개 INSERT
- 중간에 실패하면 전부 롤백 (트랜잭션 처리)
'''

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.child import Child, Wishlist
from backend.schemas.child_schema import ChildCreate, ChildOut, WishlistItemOut
from backend.models.gift import FinishedGoods

router = APIRouter(
    prefix="/list-elf/child",
    tags=["List Elf"],
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
            StatusCode="Pending",         # 기본 상태
            DeliveryStatusCode="Pending"  # 기본 배송 상태
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
        wishlist=[
            WishlistItemOut(
                wishlist_id=w.WishlistID,
                gift_id=w.GiftID,
                priority=w.Priority
            )
            for w in wishlist_rows
        ]
    )
