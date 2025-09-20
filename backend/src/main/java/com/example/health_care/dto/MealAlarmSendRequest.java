package com.example.health_care.dto;

import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MealAlarmSendRequest {
    private String title; // "아침 식사 시간입니다!"
    private String body; // "건강한 아침을 챙겨드세요"
    private Map<String, Object> data; // 추가 정보
}