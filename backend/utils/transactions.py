from contextlib import contextmanager
from typing import Iterator
from sqlalchemy.orm import Session


@contextmanager
def transactional_session(db: Session) -> Iterator[Session]:
    """
    - with 블록 안에서 예외가 없으면 COMMIT
    - 예외가 발생하면 ROLLBACK 후 예외 다시 발생
    """
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
