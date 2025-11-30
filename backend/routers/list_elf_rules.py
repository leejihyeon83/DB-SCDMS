'''
ListElf용 Rules 관리 API
- Rule CRUD (생성/조회/수정/삭제)
- 생성자/수정자 StaffID 기록
'''

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.rules import Rule
from backend.models.staff import Staff
from backend.schemas.rule_schema import RuleCreate, RuleUpdate, RuleOut

router = APIRouter(
    prefix="/list-elf/rules",
    tags=["List Elf"],
)


@router.post("/create", response_model=RuleOut, status_code=status.HTTP_201_CREATED)
def create_rule(payload: RuleCreate, db: Session = Depends(get_db)):
    '''
    Rule 생성
    - created_by_staff_id가 실제 존재하는 Staff인지 검증
    '''

    staff = db.query(Staff).filter(Staff.StaffID == payload.created_by_staff_id).first()
    if not staff:
        raise HTTPException(status_code=400, detail="유효하지 않은 StaffID 입니다.")

    rule = Rule(
        Title=payload.title,
        Description=payload.description,
        CreatedBy_StaffID=payload.created_by_staff_id,
        UpdatedBy_StaffID=None,
    )

    db.add(rule)
    db.commit()
    db.refresh(rule)

    return RuleOut(
        rule_id=rule.RuleID,
        title=rule.Title,
        description=rule.Description,
        created_by_staff_id=rule.CreatedBy_StaffID,
        updated_by_staff_id=rule.UpdatedBy_StaffID,
        created_at=rule.CreatedAt,
        updated_at=rule.UpdatedAt,
    )


@router.put("/update/{rule_id}", response_model=RuleOut)
def update_rule(rule_id: int, payload: RuleUpdate, db: Session = Depends(get_db)):
    '''
    Rule 수정
    - title / description / updated_by_staff_id 일부만 수정 가능
    '''

    rule = db.query(Rule).filter(Rule.RuleID == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    data = payload.dict(exclude_unset=True)

    # updated_by_staff_id가 있다면, 실제 Staff인지 검증
    if "updated_by_staff_id" in data and data["updated_by_staff_id"] is not None:
        staff = (
            db.query(Staff)
            .filter(Staff.StaffID == data["updated_by_staff_id"])
            .first()
        )
        if not staff:
            raise HTTPException(status_code=400, detail="유효하지 않은 StaffID 입니다.")

        rule.UpdatedBy_StaffID = data["updated_by_staff_id"]

    # 나머지 필드(title, description) 처리
    if "title" in data and data["title"] is not None:
        rule.Title = data["title"]
    if "description" in data and data["description"] is not None:
        rule.Description = data["description"]

    db.commit()
    db.refresh(rule)

    return RuleOut(
        rule_id=rule.RuleID,
        title=rule.Title,
        description=rule.Description,
        created_by_staff_id=rule.CreatedBy_StaffID,
        updated_by_staff_id=rule.UpdatedBy_StaffID,
        created_at=rule.CreatedAt,
        updated_at=rule.UpdatedAt,
    )


@router.get("/all", response_model=list[RuleOut])
def get_all_rules(db: Session = Depends(get_db)):
    '''
    Rule 전체 목록 조회
    - ListElf/Staff들이 운영 기준 문구를 확인하는 용도
    '''

    rules = db.query(Rule).order_by(Rule.RuleID.asc()).all()

    return [
        RuleOut(
            rule_id=r.RuleID,
            title=r.Title,
            description=r.Description,
            created_by_staff_id=r.CreatedBy_StaffID,
            updated_by_staff_id=r.UpdatedBy_StaffID,
            created_at=r.CreatedAt,
            updated_at=r.UpdatedAt,
        )
        for r in rules
    ]


@router.get("/{rule_id}", response_model=RuleOut)
def get_rule(rule_id: int, db: Session = Depends(get_db)):
    '''
    단일 Rule 조회
    '''

    rule = db.query(Rule).filter(Rule.RuleID == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    return RuleOut(
        rule_id=rule.RuleID,
        title=rule.Title,
        description=rule.Description,
        created_by_staff_id=rule.CreatedBy_StaffID,
        updated_by_staff_id=rule.UpdatedBy_StaffID,
        created_at=rule.CreatedAt,
        updated_at=rule.UpdatedAt,
    )


@router.delete("/{rule_id}")
def delete_rule(rule_id: int, db: Session = Depends(get_db)):
    '''
    Rule 삭제
    '''

    rule = db.query(Rule).filter(Rule.RuleID == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    db.delete(rule)
    db.commit()

    return {"message": "Rule deleted successfully"}
