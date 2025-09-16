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
