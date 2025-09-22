// RecoveryController.java

package com.example.health_care.controller;

import com.example.health_care.dto.RecoveryDTO.*;
import com.example.health_care.entity.RecoveryQuestionCode;
import com.example.health_care.service.RecoveryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.util.*;
import java.util.stream.Collectors;

/*
* 비밀번호 복구 모듈 (모든 구성요소를 한 파일로 통합)
*
* - [로그인 필요] PUT /api/profile/security-questions
* 본인 계정에 질문 3개/답(확인 포함) 등록 또는 수정
*
* - [공개]    POST /api/recover/start
* { id } → 등록된 4개 중 임의의 2개 질문 code 반환
*
* - [공개]    POST /api/recover/verify
* { id, answers:[{code, answer}, ...](2개) } → 정답이면 recoveryToken 발급
*
* - [공개]    POST /api/recover/reset
* { recoveryToken, newPassword } → 비밀번호 재설정
*/
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class RecoveryController {

  private final RecoveryService service;

  // 보안질문 등록/수정(3개-->2개) - 로그인 필요
  @PutMapping("/profile/security-questions")
  public ResponseEntity<?> setQuestions(@AuthenticationPrincipal UserDetails user,
      @Valid @RequestBody SetSecurityQuestionsRequest req) {
    service.setQuestions(user.getUsername(), req.getName(), req.getBirth(), req.getAnswers());
    return ResponseEntity.noContent().build();
  }

  // 복구 시작: 이메일(ID) → 랜덤 2개 코드
  @PostMapping("/recover/start")
  public ResponseEntity<?> start(@Valid @RequestBody RecoverStartRequest req) {
    try {
      List<RecoveryQuestionCode> two = service.pickTwo(req.getId());
      return ResponseEntity.ok(new RecoverStartResponse(req.getId(), two));
    } catch (IllegalStateException e) {
      return ResponseEntity.badRequest().body(Map.of("message", "보안 질문이 설정되지 않았습니다."));
    }
  }

  // 2개 답 검증 → 단기 토큰 발급
  @PostMapping("/recover/verify")
  public ResponseEntity<?> verify(@Valid @RequestBody RecoverVerifyRequest req) {
    Map<RecoveryQuestionCode, String> map = req.getAnswers().stream()
        .collect(Collectors.toMap(RecoverVerifyRequest.Ans::getCode, RecoverVerifyRequest.Ans::getAnswer));
    boolean ok = service.verifyAnswers(req.getId(), map);
    if (!ok)
      return ResponseEntity.badRequest().body(Map.of("message", "답이 올바르지 않습니다."));
    String token = service.createRecoveryToken(req.getId());
    return ResponseEntity.ok(RecoverVerifyResponse.builder().recoveryToken(token).build());
  }

  // 토큰으로 비번 재설정
  @PostMapping("/recover/reset")
  public ResponseEntity<?> reset(@Valid @RequestBody ResetPasswordRequest req) {
    boolean changed = service.resetPasswordWithToken(req.getRecoveryToken(), req.getNewPassword());
    if (!changed)
      return ResponseEntity.badRequest().body(Map.of("message", "토큰이 유효하지 않거나 만료되었습니다."));
    return ResponseEntity.ok(Map.of("message", "비밀번호가 변경되었습니다."));
  }

    // ✅ 수정: 아이디 찾기 로직 - 이메일과 질문을 함께 반환
    @PostMapping("/recover/find-id")
    public ResponseEntity<?> findId(@Valid @RequestBody FindIdRequest req) {
        try {
            // findIdWithEmail 메서드로 이메일과 질문을 함께 조회
            var result = service.findIdWithEmail(req.getName(), req.getBirth(), req.getGender());
            // FindIdResponse에 이메일과 질문을 모두 포함하여 반환
            return ResponseEntity.ok(new FindIdResponse(result.id(), result.questions()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "일치하는 사용자 정보가 없습니다."));
        }
    }
  // 📧이모지로 표시: 이메일로 인증 코드 발송 엔드포인트 추가
  @PostMapping("/recover/send-code")
  public ResponseEntity<?> sendRecoveryCode(@RequestBody Map<String, String> req) {
    final String id = String.valueOf(req.get("id")).trim();
    final String purpose = String.valueOf(req.getOrDefault("purpose", "RECOVERY"));
    service.sendRecoveryCode(id, purpose); // 6자리 코드 생성+저장+이메일 발송
    return ResponseEntity.ok(Map.of("message", "코드를 전송했습니다."));
  }

  // 📧이모지로 표시: 이메일 인증 코드 검증 및 복구 토큰 발급 엔드포인트 추가
  @PostMapping("/email/verify")
  public ResponseEntity<?> verifyEmailCode(@RequestBody Map<String, String> req) {
    final String token = String.valueOf(req.get("token")).trim();
    final String purpose = String.valueOf(req.getOrDefault("purpose", "RECOVERY"));
    var result = service.verifyEmailCodeAndIssueRecoveryToken(token, purpose); // 성공 시 (id, recoveryToken)
    if (result == null) return ResponseEntity.badRequest().body(Map.of("success", false));
    return ResponseEntity.ok(Map.of("success", true, "recoveryToken", result.recoveryToken()));
  }
}