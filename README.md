# DB-SCDMS
DB 프로젝트 SCDMS(Santa Central Data Management System)

## 기술 스택

### Backend
- **FastAPI**: Python 기반 최신 웹 프레임워크, 빠른 API 개발에 사용
- **Uvicorn**: FastAPI 서버 실행을 위한 ASGI 서버
- **SQLAlchemy**: ORM(Object Relational Mapping) 기반 DB 모델 관리 및 쿼리 실행
- **psycopg2**: Python에서 PostgreSQL과 연결하기 위한 드라이버

### Database
- **PostgreSQL**  
  오픈소스 관계형 데이터베이스(RDBMS)로, 프로젝트의 주요 데이터(사용자, 선물, 제작 정보 등)를 저장하고 관리합니다.  
  트랜잭션, JOIN, VIEW 등 고급 SQL 기능을 안정적으로 지원합니다.

### Frontend
- **HTML / CSS / JavaScript**  
  백엔드 API와 연동되는 정적 웹 인터페이스 구성에 사용
