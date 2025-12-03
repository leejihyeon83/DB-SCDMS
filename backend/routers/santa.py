# backend/routers/santa.py
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db
from backend.utils.transactions import transactional_session
from backend.models.delivery_log import DeliveryLog
from backend.models.delivery_group import DeliveryGroup, DeliveryGroupItem
from backend.models.reindeer import Reindeer
from backend.models.child import Child
from backend.models.gift import FinishedGoods
from backend.schemas.santa import (
    DeliveryGroupCreate,
    DeliveryGroupItemCreate,
    DeliveryGroupListItemResponse,
    DeliveryGroupDetailResponse,
    DeliveryGroupItemInGroup,
)

router = APIRouter(prefix="/santa", tags=["Santa"])

# 배송 그룹 생성
# POST /santa/groups
@router.post("/groups", response_model=int, status_code=201)
def create_delivery_group(
    payload: DeliveryGroupCreate,
    db: Session = Depends(get_db),
    x_staff_id: str | None = Header(default=None, alias="x-staff-id")
):
    
    # 로그인 정보 확인
    staff_id = int(x_staff_id) if x_staff_id and x_staff_id.isdigit() else None
    
    # 루돌프 존재 여부 확인
    reindeer = (
        db.query(Reindeer)
        .filter(Reindeer.reindeer_id == payload.reindeer_id)
        .first()
    )
    if not reindeer:
        raise HTTPException(status_code=404, detail="Reindeer not found")

    # ready_reindeer_view 조건: status='READY', current_stamina >= 30
    if not (reindeer.status == "READY" and reindeer.current_stamina >= 30):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reindeer is not available for delivery",
        )

    group = DeliveryGroup(
        group_name=payload.group_name,
        reindeer_id=payload.reindeer_id,
        created_by_staff_id=staff_id,
        status="PENDING",
    )
    db.add(group)
    db.commit()
    db.refresh(group)

    return group.group_id

# 그룹에 아이/선물 추가
# POST /santa/groups/{group_id}/items
@router.post("/groups/{group_id}/items", status_code=201)
def add_item_to_group(
    group_id: int,
    payload: DeliveryGroupItemCreate,
    db: Session = Depends(get_db),
):
    # 그룹 확인
    group = db.query(DeliveryGroup).filter(DeliveryGroup.group_id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Delivery group not found")

    if group.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending groups can be modified",
        )

    # 아이 존재 확인
    child = db.query(Child).filter(Child.ChildID == payload.child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    # 이미 이 그룹에 들어 있는지 확인
    exists_in_same_group = (
        db.query(DeliveryGroupItem)
        .filter(
            DeliveryGroupItem.group_id == group_id,
            DeliveryGroupItem.child_id == payload.child_id,
        )
        .first()
    )
    if exists_in_same_group:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Child is already in this group",
        )

    # 다른 Pending 그룹에 들어 있는지 확인
    exists_in_other_pending_group = (
        db.query(DeliveryGroupItem)
        .join(DeliveryGroup, DeliveryGroupItem.group_id == DeliveryGroup.group_id)
        .filter(
            DeliveryGroupItem.child_id == payload.child_id,
            DeliveryGroup.status == "PENDING",
            DeliveryGroup.group_id != group_id,
        )
        .first()
    )
    if exists_in_other_pending_group:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Child already belongs to another pending group",
        )

    # 선물(FinishedGoods) 존재 여부는 여기서 간단히만 체크 (재고 체크는 나중에 배송 시)
    gift = (
        db.query(FinishedGoods)
        .filter(FinishedGoods.gift_id == payload.gift_id)
        .first()
    )
    if not gift:
        raise HTTPException(status_code=404, detail="Gift not found")

    item = DeliveryGroupItem(
        group_id=group_id,
        child_id=payload.child_id,
        gift_id=payload.gift_id,
    )
    db.add(item)
    db.commit()

    return {"message": "Item added to group"}

# 배송 그룹 목록 조회
# GET /santa/groups
@router.get("/groups", response_model=list[DeliveryGroupListItemResponse])
def list_delivery_groups(
    status_filter: str = "PENDING",
    db: Session = Depends(get_db),
):
    # status_filter 기본값 'PENDING'
    q = (
        db.query(
            DeliveryGroup.group_id,
            DeliveryGroup.group_name,
            DeliveryGroup.reindeer_id,
            DeliveryGroup.status,
            func.count(DeliveryGroupItem.group_item_id).label("child_count"),
        )
        .outerjoin(
            DeliveryGroupItem,
            DeliveryGroup.group_id == DeliveryGroupItem.group_id,
        )
        .filter(DeliveryGroup.status == status_filter)
        .group_by(
            DeliveryGroup.group_id,
            DeliveryGroup.group_name,
            DeliveryGroup.reindeer_id,
            DeliveryGroup.status,
        )
    )

    rows = q.all()

    # 직접 dict로 매핑해서 돌려주기
    results = [
        DeliveryGroupListItemResponse(
            group_id=row.group_id,
            group_name=row.group_name,
            reindeer_id=row.reindeer_id,
            status=row.status,
            child_count=row.child_count,
        )
        for row in rows
    ]
    return results

# 그룹 상세 조회
# GET /santa/groups/{group_id}
@router.get("/groups/{group_id}", response_model=DeliveryGroupDetailResponse)
def get_delivery_group_detail(
    group_id: int,
    db: Session = Depends(get_db),
):
    group = (
        db.query(DeliveryGroup)
        .filter(DeliveryGroup.group_id == group_id)
        .first()
    )
    if not group:
        raise HTTPException(status_code=404, detail="Delivery group not found")

    # items는 relationship으로 가져옴
    items = [
        DeliveryGroupItemInGroup(
            group_item_id=item.group_item_id,
            child_id=item.child_id,
            gift_id=item.gift_id,
        )
        for item in group.items
    ]

    return DeliveryGroupDetailResponse(
        group_id=group.group_id,
        group_name=group.group_name,
        reindeer_id=group.reindeer_id,
        status=group.status,
        created_at=group.created_at,
        created_by_staff_id=group.created_by_staff_id,
        items=items,
    )

# 그룹 삭제
# DELETE /santa/groups/{group_id}
@router.delete("/groups/{group_id}", status_code=204)
def delete_delivery_group(
    group_id: int,
    db: Session = Depends(get_db),
):
    group = (
        db.query(DeliveryGroup)
        .filter(DeliveryGroup.group_id == group_id)
        .first()
    )
    if not group:
        raise HTTPException(status_code=404, detail="Delivery group not found")

    if group.status not in ("PENDING", "FAILED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending or failed groups can be deleted",
        )

    db.delete(group)  # items도 같이 삭제
    db.commit()
    return

@router.post("/groups/{group_id}/deliver")
def deliver_group(
    group_id: int,
    db: Session = Depends(get_db),
    x_staff_id: str | None = Header(default=None, alias="x-staff-id")
):
    """
    배송 그룹 단위로 실제 배송 실행

    - 전제: group.status == 'PENDING'
    - 그룹 안 모든 (child, gift)에 대해:
        * Child.DeliveryStatusCode = 'DELIVERED'
        * Finished_Goods.stock_quantity - 1 (0 미만이면 실패)
        * delivery_log INSERT
    - 루돌프:
        * status == 'READY' 이고 current_stamina >= 30, current_magic >= 10 이어야 함
        * 성공 시 current_stamina -10, current_magic -10, status = 'ONDELIVERY'
    - 그룹:
        * 성공 시 status = 'DONE'
        * 트랜잭션 내에서 예외 나면 ROLLBACK 후 status = 'FAILED'
    """
    
    staff_id = int(x_staff_id) if x_staff_id and x_staff_id.isdigit() else None

    # 그룹 기본 체크 (존재 여부 + 상태)
    group = (
        db.query(DeliveryGroup)
        .filter(DeliveryGroup.group_id == group_id)
        .first()
    )
    if not group:
        raise HTTPException(status_code=404, detail="Delivery group not found")

    if group.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PENDING groups can be delivered",
        )

    try:
        # ============================
        # 트랜잭션 시작
        # ============================
        with transactional_session(db) as tx:
            # 그룹과 연관된 아이/선물 목록
            items = (
                tx.query(DeliveryGroupItem)
                .filter(DeliveryGroupItem.group_id == group_id)
                .all()
            )
            if not items:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Delivery group has no items",
                )

            # 루돌프 조회
            reindeer = (
                tx.query(Reindeer)
                .filter(Reindeer.reindeer_id == group.reindeer_id)
                .first()
            )
            if not reindeer:
                raise HTTPException(
                    status_code=404,
                    detail="Reindeer not found for this group",
                )

            # READY + stamina / magic 조건 확인
            if reindeer.status != "READY":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Reindeer is not READY",
                )

            if reindeer.current_stamina < 30 or reindeer.current_magic < 10:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Reindeer stamina/magic is not enough for delivery",
                )
            
            from collections import defaultdict

            needed_counts = defaultdict(int)
            for item in items:
                needed_counts[item.gift_id] += 1

            shortages = []
            
            for gift_id, count_needed in needed_counts.items():
                gift = tx.query(FinishedGoods).filter(FinishedGoods.gift_id == gift_id).first()
            
                if not gift:
                    shortages.append(f"상품#{gift_id}(존재하지 않음)")
                elif gift.stock_quantity < count_needed:
                    shortages.append(f"{gift.gift_name} (부족: {count_needed - gift.stock_quantity}개)")

            if shortages:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"재고 부족 품목이 있습니다: {', '.join(shortages)}"
                )

            delivered_count = 0

            # ============================
            # 각 아이/선물에 대해 배송 처리
            # ============================
            for item in items:
                # Child / Gift 조회
                child = (
                    tx.query(Child)
                    .filter(Child.ChildID == item.child_id)
                    .first()
                )
                if not child:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Child {item.child_id} not found",
                    )

                gift = (
                    tx.query(FinishedGoods)
                    .filter(FinishedGoods.gift_id == item.gift_id)
                    .first()
                )
                if not gift:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Gift {item.gift_id} not found",
                    )

                # 이미 배송된 아이면 에러
                if getattr(child, "DeliveryStatusCode", None) == "DELIVERED":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Child {child.ChildID} already delivered",
                    )

                # 재고 부족 방지
                if gift.stock_quantity <= 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Not enough stock for gift {gift.gift_id}",
                    )

                # 상태 변경
                child.DeliveryStatusCode = "DELIVERED"
                gift.stock_quantity -= 1

                # 배송 로그 기록
                log = DeliveryLog(
                    child_id=child.ChildID,
                    gift_id=gift.gift_id,
                    delivered_by_staff_id=staff_id
                )
                tx.add(log)

                delivered_count += 1

            # ============================
            # 루돌프 상태/스탯 변경
            # ============================
            reindeer.current_stamina -= 10
            reindeer.current_magic -= 10
            reindeer.status = "ONDELIVERY"

            # ============================
            # 그룹 상태 DONE 으로
            # ============================
            group.status = "DONE"

        # with 블록을 예외 없이 빠져나오면 COMMIT 완료

        return {
            "message": "Delivery completed",
            "group_id": group_id,
            "delivered_count": delivered_count,
            "reindeer_id": group.reindeer_id,
        }

    except HTTPException as e:
        # 비즈니스 에러 -> 그룹을 FAILED 로 표시
        group.status = "FAILED"
        db.commit()
        raise e

    except Exception as e:
        # 예기치 못한 에러 -> 그룹 FAILED 처리 후 500
        group.status = "FAILED"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Delivery failed due to unexpected error",
        )
