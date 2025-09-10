-- RECORD 테이블에 식단 상세 정보 컬럼 추가
-- 식단 상세 정보를 JSON으로 저장

ALTER TABLE RECORD ADD (
    meal_details CLOB  -- JSON: {"morning": [...], "lunch": [...], "dinner": [...]}
);

-- 컬럼 추가 확인
SELECT * FROM RECORD;