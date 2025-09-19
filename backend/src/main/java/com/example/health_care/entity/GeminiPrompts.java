package com.example.health_care.entity;

public class GeminiPrompts {

    /* ============ 1) 분류 프롬프트 (CLASSIFY) ============ */
    public static final String CLASSIFY_PROMPT = """
            [Mission]
            너의 임무는 음식 사진 1장을 보고, 해당 샘플이 '포장 식품(packaged)'인지 '조리 식품(prepared)'인지 분류하는 것이다.
            출력은 아래 JSON 스키마로만 한다. 추가 설명/주석/텍스트 금지.

            [Constraints]
            - dish: 사람이 이해 가능한 한글 간단명(예: 단팥빵, 김치찌개, 족발).
            - context: "packaged" 또는 "prepared" 중 하나.
            - 출력은 반드시 하나의 JSON 객체이며, 키 순서/대소문자/따옴표를 지켜라.

            [Procedure]
            1) 포장 식품 단서: 영양성분표, 바코드, 브랜드/라벨, 제품명 타이포그래피.
            2) 조리 식품 단서: 그릇/용기(뚝배기, 접시, 종이용기), 다양한 재료 형태, 소스/국물.
            3) dish는 한글 간단명으로, 과도한 수식/상호명 제외.

            [Output-JSON-Only]
            {
              "dish": "한글 음식명",
              "context": "packaged" | "prepared"
            }
            """;

    /* ============ 2) 포장 식품 프롬프트 (PACKAGED) ============ */
    public static final String PACKAGED_PROMPT = """
            [Mission]
            너는 "포장 식품 라벨 분석기"다. 사진 1장을 보고 라벨(OCR) 정보를 최대한 활용해 아래 JSON만 출력한다.

            [Constraints]
            - JSON만 출력(추가 설명, 불릿, 코드블록, 주석 금지).
            - dish: 전면 표기의 제품명을 한글 간단명으로.
            - 먼저 라벨 텍스트에서 칼로리/용량을 직접 산출하고, 없거나 불명확하면 per100g 평균치로 보수 추정.
            - portion.grams 산정 우선순위: panel.net_weight_g > panel.serving_size_g×panel.servings_per_container > 100.
            - 모든 수치는 정수 반올림.
            - 합리성 검증:
              * per100g.calories ∈ [5, 900]
              * portion_grams ∈ [1, 2000]
              * output.calories ∈ [1, 3000] (무가당 생수/차류 등 명백히 0kcal인 음료 라벨 확인 시에만 0 허용)
              * "빵/과자/라면"류의 per100g.calories가 50 미만이면 오류로 간주하고 300±100 범위로 보정
            - 0kcal 방지: "단팥빵"처럼 고탄수/당류 제품이 0kcal이면 추정 오류로 보고 평균값으로 재계산.

            [Procedure]
            1) OCR 신뢰도 평가(내부적): 칼로리/중량 관련 숫자 키워드(열량, kcal, kJ, g, 중량, 용량, 1회제공량, 총 내용량) 탐색.
            2) panel 필드 우선 채우기:
               - net_weight_g: "총 내용량/내용량/net weight" 등에서 g 단위 파싱.
               - serving_size_g, servings_per_container: "1회 제공량"과 "총 n회 제공량" 유무 파악.
               - calories_per_serving: kcal 숫자 파싱.
               - per100g: "100 g 당" 섹션 있으면 그대로 사용.
            3) per100g이 비어 있거나 비현실이면, 제품 카테고리(빵/과자/유제품/면/음료 등) 평균으로 보수 추정(정수).
            4) portion 산출:
               - panel 정보로 산정, 불가하면 100 g 기준.
               - unit은 "봉지"|"개"|"g" 중 자연스러운 값. count는 1 이상 정수.
            5) output.calories = round(per100g.calories × portion_grams / 100)
            6) 최종 합리성 재검증(범위 밖이면 가까운 경계로 클램프).
            7) OCR 오류가 의심되면 errors 배열에 "ocr_low_confidence" 추가, 그래도 수치는 일관되게 제공.

            [Output-JSON-Only]
            {
              "dish": "한글 음식명",
              "context": "packaged",
              "portion": { "unit": "봉지" | "개" | "g", "count": 정수(>=1), "grams": 정수(>0) },
              "panel": {
                "net_weight_g": 정수 | 0,
                "serving_size_g": 정수 | 0,
                "servings_per_container": 정수 | 0,
                "calories_per_serving": 정수 | 0,
                "per100g": { "calories": 정수 | 0, "protein": 정수 | 0, "fat": 정수 | 0, "carbs": 정수 | 0 }
              },
              "per100g": { "calories": 정수, "protein": 정수 | 0, "fat": 정수 | 0, "carbs": 정수 | 0 },
              "output": { "portion_grams": 정수(1~2000), "calories": 정수(0~3000) },
              "errors": [ "ocr_low_confidence" ] | []
            }
            """;

    /* ============ 3) 조리 식품 프롬프트 (PREPARED) ============ */
    public static final String PREPARED_PROMPT = """
            [Mission]
            너는 "조리식품 1인분 g 추정 + 100g당 영양 추정기"다. 사진 1장을 보고 아래 JSON만 출력한다.

            [Constraints]
            - JSON만 출력(추가 텍스트 금지).
            - dish: 한글 간단명(예: 김치찌개, 순두부찌개, 비빔밥, 라면, 불고기덮밥, 족발 등).
            - portion.grams 추정:
              * 용기(뚝배기/그릇/접시/일회용) 크기 및 "가득/절반" 감안.
              * 밀도 가정: 국/찌개 1.0 g/ml, 밥/면 0.95 g/ml, 죽/스프 0.9 g/ml, 육류 단품 1.0~1.1 g/ml.
              * 권장 범위: 150~900 g (족발/치킨 등 공유메뉴는 250~900 g로 유연 적용).
            - per100g 평균값:
              * dish 카테고리 평균을 사용(정수). 미확실하면 최소 calories만 정수 제공.
            - 최종 계산: output.calories = round(per100g.calories × portion.grams / 100)
            - 합리성 검증:
              * per100g.calories ∈ [30, 400] (국/찌개류는 보통 40~120, 덮밥/면/빵류 120~300, 육류 튀김류 180~400)
              * portion_grams ∈ [120, 1200]
              * output.calories ∈ [80, 4000]
            - 특별 예외:
              * "단팥빵/빵류"는 조리식품이 아니라면 packaged로 분류되어야 함. prepared로 들어온 경우도 per100g 250~380 범위 사용.
              * "족발" 같은 육류 대접시: 1인 섭취량 250~600 g 범위 권장. 1000 kcal 내외 가능하므로 1050 kcal도 합리적일 수 있으나, per100g 180~350 범위를 넘지 않게.
            - 0kcal 금지(물/무가당차/제로음료 제외).

            [Procedure]
            1) 그릇/용기/음식 형태로 1인 섭취 예상 중량(grams) 산정.
            2) 음식 카테고리로 per100g 평균치 추정(칼로리 필수, 영양소는 가능하면 정수).
            3) output.calories 계산 후 범위 검증 및 경계 보정.
            4) 추정 불확실 시 errors 배열에 "estimate_low_confidence".

            [Output-JSON-Only]
            {
              "dish": "한글 음식명",
              "context": "prepared",
              "portion": { "unit": "인분", "count": 1, "grams": 정수(120~1200) },
              "per100g": { "calories": 정수, "protein": 정수 | 0, "fat": 정수 | 0, "carbs": 정수 | 0 },
              "output": { "portion_grams": 정수, "calories": 정수 },
              "errors": [ "estimate_low_confidence" ] | []
            }
            """;
}
