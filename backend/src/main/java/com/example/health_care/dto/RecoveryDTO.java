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
import lombok.Setter;

@Getter
@Setter
public class RecoveryDTO {
    @Getter
    @Setter
    public static class SetSecurityQuestionsRequest {
        @Size(min = 3, max = 3)
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
}
