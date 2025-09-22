package com.example.health_care.dto;

import java.util.List;

import com.example.health_care.entity.RecoveryQuestionCode;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
public class RecoveryDTO {

    // 보안질문 설정 DTO
    @Getter
    @Setter
    public static class SetSecurityQuestionsRequest {
        @NotBlank
        private String name;
        @NotBlank
        private String birth;
        @Size(min = 2, max = 2)
        @Valid
        private List<Item> answers;

        @Getter
        @Setter
        public static class Item {

            @NotNull
            private RecoveryQuestionCode code;
            @NotBlank
            private String answer;
            @NotBlank
            private String confirm;
        }
    }

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class RecoverStartRequest {
        @NotBlank
        private String id;
    }

    @Getter
    @Setter
    @AllArgsConstructor
    public static class RecoverStartResponse {
        private String id;
        private List<RecoveryQuestionCode> questions;
    }

    // 인증완료해서 토큰 발급 DTO
    @Getter
    @Setter
    public static class RecoverVerifyRequest {
        @NotBlank
        private String id;
        @Size(min = 2, max = 2)
        @Valid
        private List<Ans> answers;

        @Getter
        @Setter
        public static class Ans {
            @NotNull
            private RecoveryQuestionCode code;
            @NotBlank
            private String answer;
        }
    }

    @Getter
    @Setter
    @Builder
    public static class RecoverVerifyResponse {
        private String recoveryToken;
    }

    @Getter
    @Setter
    public static class ResetPasswordRequest {
        @NotBlank
        private String recoveryToken;
        @NotBlank
        @Size(min = 8, max = 64)
        private String newPassword;
    }

    // 아이디 찾기 DTO
    @Getter
    @Setter
    public static class FindIdRequest {
        @NotBlank
        private String name;
        @NotBlank
        private String birth;
        @NotBlank
        private String gender;
    }

    @Getter
    @Setter
    @AllArgsConstructor
    public static class FindIdResponse {
        private String id;
        private List<RecoveryQuestionCode> questions;
    }
}
