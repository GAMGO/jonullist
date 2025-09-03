package com.example.health_care.dto;

import com.example.health_care.entity.CustomersEntity;
import com.example.health_care.entity.CustomersEntity.Gender;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SignupResponse {
    private String id;
    private Double weight;
    private Integer age;
    private Gender gender;
    private Double height;

    private String accessToken; // JTW
    private String tokenType; // "Bearer"
    private long expiresIn; // 만료 시간(초) <- 추가해두면 프론트가 토큰 관리 편리함.


    // AuthController 에서 엔티티를 그대로 반환하지 않고 DTO로 변환하기 위해 추가
    public static SignupResponse fromEntity(CustomersEntity entity) {
       return SignupResponse.builder()
                .id(entity.getId())
                .weight(entity.getWeight())
                .age(entity.getAge())
                .gender(entity.getGender())
                .height(entity.getHeight())
                .build();
    }
}
