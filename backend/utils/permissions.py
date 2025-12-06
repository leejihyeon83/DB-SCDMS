import os
from sqlalchemy import text
from sqlalchemy.engine import Engine

def apply_permissions(engine: Engine):
    """
    sql/roles_and_grants.sql 파일을 읽어서 DB 권한을 적용합니다.
    """
    
    # [수정됨] main.py가 있는 루트 기준, sql 폴더 안의 파일을 찾습니다.
    # 친구가 윈도우를 쓰든 맥을 쓰든 경로 오류가 안 나도록 os.path.join을 사용합니다.
    base_dir = os.getcwd() # 현재 프로젝트 루트 경로 (main.py가 실행되는 위치)
    sql_file_path = os.path.join(base_dir, "backend", "sql", "roles_and_grants.sql")

    print(f"📂 '{sql_file_path}' 경로에서 SQL 파일을 찾고 있습니다...")

    if not os.path.exists(sql_file_path):
        print(f"⚠️ [주의] 파일을 찾을 수 없습니다: {sql_file_path}")
        print("   -> 'sql' 폴더 안에 'roles_and_grants.sql' 파일이 있는지 확인해주세요.")
        return

    try:
        # 1. SQL 파일 읽기
        with open(sql_file_path, "r", encoding="utf-8") as f:
            sql_script = f.read()

        # 2. DB에 실행
        with engine.connect() as conn:
            with conn.begin():
                conn.execute(text(sql_script))
        
        print("✅ [성공] 권한 설정(SQL 파일)이 DB에 완벽하게 적용되었습니다!")

    except Exception as e:
        print(f"❌ [오류] SQL 실행 중 문제가 발생했습니다: {e}")