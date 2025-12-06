-- 사용 DB 명: santa_db

-- ---------------------------------------------------------
-- 0. public 권한 초기화
-- ---------------------------------------------------------
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;

-- ---------------------------------------------------------
-- 1. 역할 생성 - Santa / ListElf / GiftElf / Keeper
-- ---------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'role_santa') THEN
        CREATE ROLE role_santa NOINHERIT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'role_listelf') THEN
        CREATE ROLE role_listelf NOINHERIT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'role_giftelf') THEN
        CREATE ROLE role_giftelf NOINHERIT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'role_keeper') THEN
        CREATE ROLE role_keeper NOINHERIT;
    END IF;
END $$;

-- ---------------------------------------------------------
-- 2. 로그인 가능한 계정 생성
-- ---------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'santa1') THEN
        CREATE ROLE santa1 LOGIN PASSWORD '1234' IN ROLE role_santa;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'santa2') THEN
        CREATE ROLE santa2 LOGIN PASSWORD '1234' IN ROLE role_santa;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'listelf1') THEN
        CREATE ROLE listelf1 LOGIN PASSWORD '1234' IN ROLE role_listelf;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'listelf2') THEN
        CREATE ROLE listelf2 LOGIN PASSWORD '1234' IN ROLE role_listelf;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'giftelf1') THEN
        CREATE ROLE giftelf1 LOGIN PASSWORD '1234' IN ROLE role_giftelf;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'giftelf2') THEN
        CREATE ROLE giftelf2 LOGIN PASSWORD '1234' IN ROLE role_giftelf;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'keeper1') THEN
        CREATE ROLE keeper1 LOGIN PASSWORD '1234' IN ROLE role_keeper;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'keeper2') THEN
        CREATE ROLE keeper2 LOGIN PASSWORD '1234' IN ROLE role_keeper;
    END IF;
END $$;

-- ---------------------------------------------------------
-- 3. DB / 스키마 / 시퀀스 권한 (공통)
-- ---------------------------------------------------------

-- 3-1) DB 접속 권한
GRANT CONNECT ON DATABASE santa_db
  TO role_santa, role_listelf, role_giftelf, role_keeper;

-- 3-2) public 스키마 사용 권한
GRANT USAGE ON SCHEMA public
  TO role_santa, role_listelf, role_giftelf, role_keeper;

-- 3-3) 자동 증가용 시퀀스 권한
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public
  TO role_santa, role_listelf, role_giftelf, role_keeper;

-- =====================================================================
-- 4. 테이블별 권한 부여
-- =====================================================================

-- ------------------------
-- 4-1. 공통 참조 테이블
-- ------------------------

-- Staff: 4개 역할 모두 SELECT
GRANT SELECT ON TABLE staff
  TO role_santa, role_listelf, role_giftelf, role_keeper;

-- Regions: Santa, ListElf
GRANT SELECT ON TABLE regions
  TO role_santa, role_listelf;

-- Status Codes (ChildStatusCode, DeliveryStatusCode): Santa, ListElf
GRANT SELECT ON TABLE child_status_code
  TO role_santa, role_listelf;

GRANT SELECT ON TABLE delivery_status_code
  TO role_santa, role_listelf;

-- ------------------------
-- 4-2. Child 도메인 (Child, Wishlist, Rules)
-- ------------------------

-- Child
-- Santa : R, U
-- GiftElf: R
-- ListElf : C, R, U, D
GRANT SELECT, UPDATE ON TABLE child
  TO role_santa;

GRANT SELECT, UPDATE ON TABLE child
  TO role_giftelf;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE child
  TO role_listelf;

-- Wishlist
-- Santa : R
-- GiftElf : R (수요 파악)
-- ListElf : C, R, U, D
GRANT SELECT ON TABLE wishlist
  TO role_santa, role_giftelf;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE wishlist
  TO role_listelf;

-- Rules
-- ListElf만 C, R, U, D
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE rules
  TO role_listelf;

-- ------------------------
-- 4-3. Production 도메인
--      (Raw_Materials, Finished_Goods, Gift_BOM,
--       Production_Log, Production_Usage)
-- ------------------------

-- Raw_Materials
-- GiftElf : C, R, U, D
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Raw_Materials"
  TO role_giftelf;

-- Finished_Goods
-- Santa, ListElf : R
-- GiftElf : C, R, U, D
GRANT SELECT ON TABLE "Finished_Goods"
  TO role_santa, role_listelf;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Finished_Goods"
  TO role_giftelf;

-- Gift_BOM
-- GiftElf : C, R, U, D
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE gift_bom
  TO role_giftelf;

-- Production_Log
-- GiftElf : C, R (수정불가 -> INSERT, SELECT만 부여)
GRANT INSERT, SELECT ON TABLE "Production_Log"
  TO role_giftelf;

-- Production_Usage
-- GiftElf : C, R
GRANT INSERT, SELECT ON TABLE "Production_Usage"
  TO role_giftelf;

-- ------------------------
-- 4-4. Reindeer 도메인
--      (Reindeer, Reindeer_Health_Log, ready_reindeer_view)
-- ------------------------

-- Reindeer
-- Santa  : R
-- Keeper : C, R, U, D
GRANT SELECT ON TABLE reindeer
  TO role_santa;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE reindeer
  TO role_keeper;

-- Reindeer_Health_Log
-- Keeper : C, R, U, D
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE reindeer_health_log
  TO role_keeper;

-- ready_reindeer_view
-- Santa, Keeper : R
GRANT SELECT ON TABLE ready_reindeer_view
  TO role_santa, role_keeper;

-- ------------------------
-- 4-5. Delivery 도메인
--      (DeliveryGroup, DeliveryGroupItem, Delivery_Log)
-- ------------------------

-- DeliveryGroup
-- Santa : C, R, U, D
-- Keeper: R (일정 확인)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE delivery_group
  TO role_santa;

GRANT SELECT ON TABLE delivery_group
  TO role_keeper;

-- DeliveryGroupItem
-- Santa : C, R, U, D
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE delivery_group_item
  TO role_santa;

-- Delivery_Log
-- Santa : C, R
-- ListElf / GiftElf / Keeper : R
GRANT INSERT, SELECT ON TABLE delivery_log
  TO role_santa;

GRANT SELECT ON TABLE delivery_log
  TO role_listelf, role_giftelf, role_keeper;

GRANT role_giftelf TO postgres;
GRANT role_listelf TO postgres;
GRANT role_santa TO postgres;
GRANT role_keeper TO postgres;