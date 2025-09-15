package com.example.health_care.dto;

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
public class EmailVerificationResponse {
    
    private boolean success;
    private String message;
    private String email;
    
    public static EmailVerificationResponse success(String email) {
        return EmailVerificationResponse.builder()
                .success(true)
                .message("이메일 인증이 완료되었습니다")
                .email(email)
                .build();
    }
    
    public static EmailVerificationResponse failure(String message) {
        return EmailVerificationResponse.builder()
                .success(false)
                .message(message)
                .email(null)
                .build();
    }
}