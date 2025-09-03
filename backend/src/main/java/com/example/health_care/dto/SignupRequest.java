package com.example.health_care.dto;

import com.example.health_care.entity.CustomersEntity.Gender;
import jakarta.validation.constraints.*;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SignupRequest {

    @NotBlank
    @Email(message = "올바른 이메일 형식이어야 합니다.")
    @Pattern(
        regexp = "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$",
        message = "이메일에는 @와 .이 포함되어야 합니다."
    )
    private String id;

    @NotBlank
    @Size(max = 8, message = "비밀번호는 최대 8자리까지만 가능합니다.")
    private String password;

    @Positive @Digits(integer = 3, fraction = 1)
    private Double weight;

    @Positive @Max(150)
    private Integer age;

    private Gender gender;

    @Positive @Digits(integer = 3, fraction = 1)
    private Double height;
}
