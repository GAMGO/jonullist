package com.example.health_care.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor
public class LoginRequest {

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
}
