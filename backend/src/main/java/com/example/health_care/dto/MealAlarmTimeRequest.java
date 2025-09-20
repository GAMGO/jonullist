package com.example.health_care.dto;

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
public class MealAlarmTimeRequest {
    private Integer morningHour;
    private Integer morningMinute;
    private Integer lunchHour;
    private Integer lunchMinute;
    private Integer dinnerHour;
    private Integer dinnerMinute;
    private Boolean alarmEnabled;
}