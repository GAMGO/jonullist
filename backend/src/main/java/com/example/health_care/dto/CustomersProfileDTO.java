package com.example.health_care.dto;

import com.example.health_care.entity.CustomersEntity.Gender;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomersProfileDTO {
    private String id;
    private Double weight;
    private Integer age;
    private Gender gender;
    private Double height;
}
