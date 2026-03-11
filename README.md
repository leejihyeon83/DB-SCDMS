# Santa Central Data Management System (SCDMS)

Santa Central Data Management System (SCDMS)는 크리스마스 시즌의 산타 마을 물류 시스템을 배경으로 한 역할 기반 데이터 관리 웹 서비스입니다.

아이 명단 관리, 선물 생산, 재료 관리, 루돌프 배송까지의 과정을 실제 기업의 물류·재고·배송 시스템처럼 통합 관리할 수 있도록 설계하였습니다.

# 프로젝트 개요

### 핵심 시나리오

Santa Village에서의 선물 배송 과정은 다음과 같은 흐름으로 진행됩니다.

```
아이 심사
   ↓
선물 수요 집계
   ↓
재료 채굴 및 선물 생산
   ↓
루돌프 배치
   ↓
선물 배송
```

각 단계는 서로 다른 역할이 담당하며 하나의 데이터베이스에서 협력적으로 처리됩니다.

# 사용자 역할

시스템에는 4개의 역할이 존재합니다.

| Role        | Description      |
| ----------- | ---------------- |
| Santa    | 전체 시스템 관리        |
| List Elf | 아이 명단 및 선물 수요 관리 |
| Gift Elf | 선물 생산 및 재고 관리    |
| Keeper   | 루돌프 및 배송 관리      |

각 역할은 서로 다른 DB 권한과 기능을 가집니다.

# 시스템 아키텍처

```
Frontend
   ↓
FastAPI Backend
   ↓
SQLAlchemy ORM
   ↓
PostgreSQL Database
```

# 기술 스택

## Frontend

* HTML5
* CSS3
* JavaScript (ES6+)
* Bootstrap 5
* SweetAlert2

## Backend

* Python 3.x
* FastAPI
* SQLAlchemy
* bcrypt
* Uvicorn
* psycopg2

## Database

* PostgreSQL

# 데이터베이스 설계

주요 엔티티:

* User
* Role
* Child
* Wishlist
* Gift
* Material
* GiftBOM
* Inventory
* Reindeer
* DeliveryGroup
* DeliveryLog

### 핵심 특징

* 역할 기반 권한 분리 (RBAC)
* 선물 생산을 위한 BOM 구조
* 배송 그룹 기반 물류 관리
* 트랜잭션 기반 생산/재고 처리

# 역할 기반 접근 제어

PostgreSQL의 DB 권한 시스템을 활용하여 역할별 접근을 제어했습니다.

사용 기술

```
GRANT
REVOKE
SET ROLE
```

권한 구조

| Role     | 주요 권한                        |
| -------- | ---------------------------- |
| Santa    | 전체 조회 및 관리                   |
| List Elf | Child / Wishlist 관리          |
| Gift Elf | Gift / Material / Production |
| Keeper   | Reindeer / Delivery 관리       |

# 주요 기능

## 1. Child Management (List Elf)

* 아이 정보 등록
* 선호 선물(Wishlist) 등록
* Naughty / Nice 판정 관리
* 선물 수요 통계 제공

## 2. Gift Production System (Gift Elf)

선물 생산 시 필요한 재료를 BOM 구조로 관리합니다.

기능

* 선물별 재료 목록 정의
* 생산 수량에 따른 재료 자동 계산
* 재고 부족 시 전체 트랜잭션 Rollback

## 3. Inventory & Material Management

* 재료 채굴
* 재고 관리
* 생산 시 재고 자동 차감

## 4. Delivery Management (Santa)

배송 그룹 기반 관리 시스템

기능

* 지역별 배송 그룹 생성
* 루돌프 배정
* 배송 상태 관리

배송 상태

```
PENDING
READY
ON_DELIVERY
FAILED
COMPLETED
```

## 5. Reindeer Management (Keeper)

루돌프 상태 관리 시스템

상태

```
READY
RESTING
ON_DELIVERY
```

속성

* 체력
* 마력
* 배송 가능 여부

# 비즈니스 로직

### Gift Production

```
Gift 생산 요청
      ↓
BOM 기반 재료 계산
      ↓
재고 확인
      ↓
충분하면 생산
부족하면 Rollback
```

### Delivery Process

```
Delivery Group 생성
      ↓
Reindeer 배정
      ↓
배송 실행
      ↓
배송 로그 기록
```

# 실행 방법

## 1. Clone Repository

```bash
git clone https://github.com/your-repository/scdms.git
cd scdms
```

## 2. Backend Setup

```bash
pip install -r requirements.txt
```

서버 실행

```bash
uvicorn main:app --reload
```

## 3. Database Setup

PostgreSQL 실행 후

```sql
CREATE DATABASE scdms;
```

DB 초기화 스크립트 실행

```
schema.sql
seed.sql
```

# 프로젝트 구조

```
SCDMS
│
├── backend
│   ├── models
│   ├── routers
│   ├── services
│   └── main.py
│
├── frontend
│   ├── html
│   ├── css
│   └── js
│
├── database
│   ├── schema.sql
│   └── seed.sql
│
└── README.md
```
