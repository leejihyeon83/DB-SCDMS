import os
from sqlalchemy import text
from sqlalchemy.engine import Engine

def apply_permissions(engine: Engine):
    '''
    sql/roles_and_grants.sql 파일을 읽어서 DB 권한을 적용
    '''

    base_dir = os.getcwd() 
    sql_file_path = os.path.join(base_dir, "backend", "sql", "roles_and_grants.sql")
    
    if not os.path.exists(sql_file_path):
        print(f"파일을 찾을 수 없습니다: {sql_file_path}")
        return

    try:
        # 1. SQL 파일 읽기
        with open(sql_file_path, "r", encoding="utf-8") as f:
            sql_script = f.read()

        # 2. DB에 실행
        with engine.connect() as conn:
            with conn.begin():
                conn.execute(text(sql_script))

    except Exception as e:
        print(f"문제가 발tod: {e}")