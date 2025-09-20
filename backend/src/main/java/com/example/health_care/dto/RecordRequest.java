package com.example.health_care.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecordRequest {

    // 아침, 점심, 저녁 칼로리 기록
    @NotNull
    @PositiveOrZero
    @Digits(integer = 10, fraction = 0)
    private Long caloriesM;

    @NotNull
    @PositiveOrZero
    @Digits(integer = 10, fraction = 0)
    private Long caloriesL;

    @NotNull
    @PositiveOrZero
    @Digits(integer = 10, fraction = 0)
    private Long caloriesD;
    
    // 그 시점의 목표 몸무게와 칼로리 (RECORD 테이블 스키마에 따라)
    @NotNull
    @PositiveOrZero
    @Digits(integer = 4, fraction = 1)
    private Double targetWeight;

    @NotNull
    @PositiveOrZero
    @Digits(integer = 5, fraction = 0)
    private Integer targetCalories;
}