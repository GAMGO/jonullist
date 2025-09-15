package com.example.health_care.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DietRequest {
    
    @NotBlank
    private String date; // "2024-01-15"
    
    @NotBlank
    private String type; // "morning", "lunch", "dinner"
    
    @NotBlank
    private String food; // "초코파이"
    
    @NotNull
    @PositiveOrZero
    private Long calories; // 200
    
    private Long timestamp; // 식품 추가 시간 (선택사항)
}
