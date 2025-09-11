// 공공 데이터 API 용 foodDTO

package com.example.health_care.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FoodDTO {
    private String foodNm;   // 음식명
    private Double enerc;    // 열량(kcal)
}

// 요청용 DTO
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FoodAnalyzeRequest {
    private String imageUrl; // React Native에서 전달되는 이미지 URL
}

// 응답용 DTO
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FoodAnalyzeResponse {
    private String dish;
    private int calories;
}