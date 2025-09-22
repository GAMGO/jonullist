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
     // ✅ 수정: 아이디 찾기 - 이메일과 질문을 함께 반환하는 Record 클래스 추가
    public record FindIdResult(String id, List<RecoveryQuestionCode> questions) {}

    // 해당 계정이 보안설정이 되어있다면 조회 및 해당 질문 반환.
    @Transactional(readOnly = true)
    public List<RecoveryQuestionCode> findId(String name, String birth, String gender) {

        // 1. RecoveryRepository를 사용하여 이름과 생년월일로 사용자를 찾습니다.
        // RecoveryEntity에는 name과 birth 필드가 있으므로 이 리포지토리를 사용해야 합니다.
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
        // 2. 찾은 RecoveryEntity에서 customerId를 가져와 CustomersEntity를 조회하여 성별을 확인합니다.
        // 이 로직을 통해 CustomersEntity의 idx와 gender를 연결합니다.
        Long customerId = recoveries.get(0).getCustomerId();
        CustomersEntity customer = customersRepo.findByIdxAndGender(customerId, genderEnum)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // 3. 찾은 customer의 idx로 보안 질문을 가져옵니다.
        List<RecoveryEntity> all = repo.findByCustomerId(customer.getIdx());
        if (all.size() < 2) {
            throw new IllegalArgumentException("보안 질문이 설정되지 않았습니다.");
        }
        
        // 4. 사용자가 설정한 질문 2개를 반환합니다.
        return all.stream().map(RecoveryEntity::getCode).collect(Collectors.toList());
    }

    // ✅ 추가: 아이디 찾기 - 이메일과 질문을 함께 반환하는 메서드
    @Transactional(readOnly = true)
    public FindIdResult findIdWithEmail(String name, String birth, String gender) {
        // 1. 이름과 생년월일로 사용자 찾기
        List<RecoveryEntity> recoveries = repo.findByNameAndBirth(name, birth);
        if (recoveries.isEmpty()) {
            throw new IllegalArgumentException("사용자를 찾을 수 없습니다.");
        }

        // 2. 성별 검증 및 고객 정보 조회
        Gender genderEnum = Gender.valueOf(gender.toUpperCase());
        Long customerIdx = recoveries.get(0).getCustomerId();
        CustomersEntity customer = customersRepo.findByIdxAndGender(customerIdx, genderEnum)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // 3. 고객 이메일(ID) 추출
        String email = customer.getId();

        // 4. 보안 질문 조회
        List<RecoveryEntity> all = repo.findByCustomerId(customer.getIdx());
        if (all.size() < 2) {
            throw new IllegalArgumentException("보안 질문이 설정되지 않았습니다.");
        }
        List<RecoveryQuestionCode> questions = all.stream().map(RecoveryEntity::getCode).collect(Collectors.toList());

        // 5. 이메일과 질문을 함께 반환
        return new FindIdResult(email, questions);
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