package com.example.health_care.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EmailVerificationRequest {
    
    @NotBlank(message = "토큰은 필수입니다")
    private String token;

    private String purpose; // ✅ 추가
}