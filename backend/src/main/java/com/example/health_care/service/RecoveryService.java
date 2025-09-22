// RecoveryService.java

package com.example.health_care.service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.health_care.dto.RecoveryDTO.*;
import com.example.health_care.entity.CustomersEntity;
import com.example.health_care.entity.Gender;
import com.example.health_care.entity.RecoveryEntity;
import com.example.health_care.entity.RecoveryQuestionCode;
import com.example.health_care.repository.CustomersRepository;
import com.example.health_care.repository.RecoveryRepository;
import com.example.health_care.security.JwtTokenProvider;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// ======================= Service =======================
@Service
@RequiredArgsConstructor
@Slf4j
public class RecoveryService {

  private final RecoveryRepository repo;
  private final CustomersRepository customersRepo;
  private final PasswordEncoder encoder;
  private final CustomersService customersService;
  private final TokenTool tokenTool;

  private String norm(String s) {
    return s == null ? "" : s.trim().toLowerCase();
  }

  // 이메일(id)을 고객의 고유 번호(idx)로 변환하는 헬퍼 메서드
  private Long getCustomerIdx(String customerId) {
    return customersRepo.findById(customerId)
        .map(CustomersEntity::getIdx)
        .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
  }
  
  @Transactional
 public void setQuestions(String customerId, String name, String birth, List<SetSecurityQuestionsRequest.Item> items) {
    if (items == null || items.size() < 2)
      throw new IllegalArgumentException("2개의 질문/답이 필요합니다.");

    Set<RecoveryQuestionCode> codes = new HashSet<>();
    for (var it : items) {
      if (!Objects.equals(it.getAnswer(), it.getConfirm()))
        throw new IllegalArgumentException("답과 확인이 일치하지 않습니다.");
      if (!codes.add(it.getCode()))
        throw new IllegalArgumentException("질문 코드가 중복되었습니다.");
    }

    // String 이메일(id)을 Long idx로 변환
    Long customerIdx = getCustomerIdx(customerId);

   // 🚨이모지로 표시: 기존 보안 질문들을 모두 삭제합니다.
  repo.deleteAllByCustomerId(customerIdx);

  // 저장(2개)
  for (var it : items) {
    RecoveryEntity e = RecoveryEntity.builder()
        .customerId(customerIdx)
        .code(it.getCode())
        // 🚨이모지로 표시: 인자로 받은 name과 birth를 바로 할당합니다.
        .name(name)
        .birth(birth)
        .build();
    e.setAnswerHash(encoder.encode(norm(it.getAnswer())));
    e.setUpdatedAt(LocalDateTime.now());
    repo.save(e);
  }
}

  @Transactional(readOnly = true)
  public List<RecoveryQuestionCode> pickTwo(String customerId) {
    // String 이메일(id)을 Long idx로 변환
    Long customerIdx = getCustomerIdx(customerId);
    List<RecoveryEntity> all = repo.findByCustomerId(customerIdx);
    if (all.size() < 2)
      throw new IllegalStateException("보안질문 미설정");
    List<RecoveryQuestionCode> codes = all.stream().map(RecoveryEntity::getCode).collect(Collectors.toList());
    // Collections.shuffle(codes); -> 2개만 설정해서 그 2개만 가져오게 수정함 랜덤셔플은 비활성화!
    return codes;
  }

  @Transactional(readOnly = true)
  public boolean verifyAnswers(String customerId, Map<RecoveryQuestionCode, String> provided) {
    // String 이메일(id)을 Long idx로 변환
    Long customerIdx = getCustomerIdx(customerId);
    List<RecoveryEntity> all = repo.findByCustomerId(customerIdx);
    Map<RecoveryQuestionCode, String> hashByCode = all.stream()
        .collect(Collectors.toMap(RecoveryEntity::getCode, RecoveryEntity::getAnswerHash));
    for (var entry : provided.entrySet()) {
      RecoveryQuestionCode code = entry.getKey();
      String ans = norm(entry.getValue());
      String hash = hashByCode.get(code);
      if (hash == null || !encoder.matches(ans, hash))
        return false;
    }
    return true;
  }
  // 해당 계정이 보안설정이 되어있다면 조회 및 해당 질문 반환.
  @Transactional(readOnly = true)
  public Map<String, Object> findId(String name, String birth, String gender) {
    List<RecoveryEntity> recoveries = repo.findByNameAndBirth(name, birth);
    
    if (recoveries.isEmpty()) {
      throw new IllegalArgumentException("사용자를 찾을 수 없습니다.");
    }
    Gender genderEnum;
    try {
      genderEnum = Gender.valueOf(gender.toUpperCase());
    } catch (IllegalArgumentException e) {
      throw new IllegalArgumentException("유효하지 않은 성별 정보입니다.");
    }
    
    Long customerId = recoveries.get(0).getCustomerId();
    // 🚨이모지로 표시: `genderEnum` 변수를 사용하도록 수정
    CustomersEntity customer = customersRepo.findByIdxAndGender(customerId, genderEnum)
        .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

    List<RecoveryEntity> all = repo.findByCustomerId(customer.getIdx());
    if (all.size() < 2) {
      throw new IllegalArgumentException("보안 질문이 설정되지 않았습니다.");
    }
    
    List<RecoveryQuestionCode> questions = all.stream().map(RecoveryEntity::getCode).collect(Collectors.toList());

    Map<String, Object> result = new HashMap<>(); 
    result.put("id", customer.getId());
    result.put("questions", questions);
    return result;
}
  // 단기 토큰 발급/검증은 TokenTool 위임
  public String createRecoveryToken(String userId) {
    return tokenTool.create(userId);
  }

  public String parseRecoveryToken(String token) {
    return tokenTool.parse(token);
  }

  @Transactional
  public boolean resetPasswordWithToken(String recoveryToken, String newPassword) {
    String uid = parseRecoveryToken(recoveryToken);
    if (uid == null)
      return false;
    customersService.updatePassword(uid, newPassword);
    return true;
  }
}

// ======================= TokenTool (JWT Provider 분리 래퍼)
// =======================
@Component
@RequiredArgsConstructor
class TokenTool {
  private final JwtTokenProvider jwt;

  public String create(String userId) {
    return jwt.createRecoveryToken(userId);
  }

  public String parse(String token) {
    return jwt.validateAndGetUserFromRecoveryToken(token);
  }
}