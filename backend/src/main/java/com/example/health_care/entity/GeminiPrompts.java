package com.example.health_care.entity;

public class GeminiPrompts {

    public static final String CLASSIFY_PROMPT = """
            너는 음식 사진 1장을 보고 아래 JSON으로만 응답한다.
            {
              "dish": "한글 음식명",
              "context": "packaged" | "prepared"
            }
            """;

    public static final String PACKAGED_PROMPT = """
            너는 "포장 식품 라벨 분석기"다. 사진 1장을 보고 라벨의 수치를 최대한 활용하여 아래 JSON으로만 응답한다.
            규칙:
            - dish는 전면 표기의 제품명을 한글로 간단히.
            - 먼저 라벨 텍스트에서 칼로리를 직접 산출한다. 없을 경우 per100g 정보를 채워 둔다(후속 계산용).
            - portion.grams는 net_weight_g > serving_size_g > 100 우선.
            - 모든 수치는 정수 반올림.

            출력(JSON만):
            {
              "dish": "한글 음식명",
              "context": "packaged",
              "portion": { "unit": "봉지" | "개" | "g", "count": 정수(>=1), "grams": 정수(>0) },
              "panel": {
                "net_weight_g": 정수,
                "serving_size_g": 정수,
                "servings_per_container": 정수,
                "calories_per_serving": 정수,
                "per100g": { "calories": 정수, "protein": 정수, "fat": 정수, "carbs": 정수 }
              },
              "per100g": { "calories": 정수, "protein": 정수, "fat": 정수, "carbs": 정수 },
              "output": { "portion_grams": 정수(1~2000), "calories": 정수 }
            }
            """;

    public static final String PREPARED_PROMPT = """
            너는 "조리식품 1인분 g 추정 + 100g당 영양 추정기"다. 사진 1장을 보고 아래 JSON으로만 응답한다.
            규칙:
            - dish는 한글 간단명(예: 김치찌개, 순두부찌개, 비빔밥, 라면, 불고기덮밥 등).
            - portion.grams는 용기(뚝배기/그릇/접시/일회용 용기 크기), 가득/절반, 재료 밀도를 고려하여 추정한다.
              (뚝배기: 소 350~450ml, 중 500~700ml 가정. 국/찌개 1.0g/ml, 밥/면 0.9~1.05g/ml, 죽/스프 0.9g/ml.)
            - per100g.* 는 해당 음식의 일반적인 평균값을 정수로 제공한다(못 찾으면 calories만 정수 근사).
            - 최종 output.calories = per100g.calories × (portion.grams / 100) (정수 반올림).
            - 오직 JSON만.

            출력(JSON만):
            {
              "dish": "한글 음식명",
              "context": "prepared",
              "portion": { "unit": "인분", "count": 1, "grams": 정수(150~900 권장) },
              "per100g": { "calories": 정수, "protein": 정수, "fat": 정수, "carbs": 정수 },
              "output": { "portion_grams": 정수, "calories": 정수 }
            }
            """;
}