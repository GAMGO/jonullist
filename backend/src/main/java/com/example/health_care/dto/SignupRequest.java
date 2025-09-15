package com.example.health_care.dto;

import com.example.health_care.entity.Gender;
import jakarta.validation.constraints.*;
import lombok.*;


@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SignupRequest {
    @NotBlank
    private String id;

    @NotBlank
    @Size(min = 8, max = 72)
    private String password;

    @Positive
    @Digits(integer = 3, fraction = 1)
    private Double weight;

    @Positive
    @Max(150)
    private Integer age;

    private Gender gender;

    @Positive
    @Digits(integer = 3, fraction = 1)
    private Double height;

    @NotBlank @Email
    private String realEmail; // 이메일 인증에 쓰이는 실제 이메일

}
