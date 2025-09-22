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
*   본인 계정에 질문 3개/답(확인 포함) 등록 또는 수정
*
* - [공개]    POST /api/recover/start
*   { id } → 등록된 4개 중 임의의 2개 질문 code 반환
*
* - [공개]    POST /api/recover/verify
*   { id, answers:[{code, answer}, ...](2개) } → 정답이면 recoveryToken 발급
*
* - [공개]    POST /api/recover/reset
*   { recoveryToken, newPassword } → 비밀번호 재설정
*/
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j // 🚨이모지로 표시: 로깅 기능을 사용하기 위해 추가
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

  // 아이디 찾기 로직
  @PostMapping("/recover/find-id")
  public ResponseEntity<?> findId(@Valid @RequestBody FindIdRequest req) {
    try {
      // 🚨이모지로 표시: 서비스 메서드로부터 Map을 반환받습니다.
      Map<String, Object> result = service.findId(req.getName(), req.getBirth(), req.getGender());
      
      String foundId = (String) result.get("id");
      List<RecoveryQuestionCode> questions = (List<RecoveryQuestionCode>) result.get("questions");
      
      // 🚨이모지로 표시: `foundId`와 `questions`를 모두 사용하여 `FindIdResponse` 객체를 생성합니다.
      return ResponseEntity.ok(new FindIdResponse(foundId, questions));
    } catch (IllegalArgumentException e) {
      log.error("findId failed: {}", e.getMessage()); // 🚨이모지로 표시: 로깅을 추가하여 오류 원인을 더 잘 파악할 수 있도록 합니다.
      return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
    }
  }
}