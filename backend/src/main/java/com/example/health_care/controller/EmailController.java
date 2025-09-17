package com.example.health_care.controller;

import com.example.health_care.dto.EmailVerificationRequest;
import com.example.health_care.dto.EmailVerificationResponse;
import com.example.health_care.entity.CustomersEntity;
import com.example.health_care.repository.CustomersRepository;
import com.example.health_care.service.EmailService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Optional;

@RestController
@RequestMapping("/api/email")
@RequiredArgsConstructor
@Slf4j
public class EmailController {

    private final EmailService emailService;
    private final CustomersRepository customersRepository;

    /**
     * 이메일 인증 확인
     * @param request 인증 요청 (토큰 포함)
     * @return 인증 결과
     */

    // 이메일 인증 확인
    @PostMapping("/verify")
    public ResponseEntity<EmailVerificationResponse> verifyEmail(@Valid @RequestBody EmailVerificationRequest request) {
        try {
            String token = request.getToken();
            log.info("이메일 인증 요청: {}", token);

            // 인증번호 형식 검증 (6자리 숫자)
            if (token == null || !token.matches("\\d{6}")) {
                return ResponseEntity.badRequest()
                        .body(EmailVerificationResponse.failure("6자리 인증번호를 입력해주세요"));
            }

            // 인증번호로 사용자 찾기
            Optional<CustomersEntity> customerOpt = customersRepository.findByEmailVerificationToken(token);
            if (customerOpt.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(EmailVerificationResponse.failure("유효하지 않은 인증번호입니다"));
            }

            CustomersEntity customer = customerOpt.get();

            // 인증번호 만료 확인
            if (emailService.isTokenExpired(customer.getEmailVerificationExpires())) {
                return ResponseEntity.badRequest()
                        .body(EmailVerificationResponse.failure("만료된 인증번호입니다"));
            }

            // 이미 인증된 사용자인지 확인
            if (customer.getEmailVerified()) {
                return ResponseEntity.ok(EmailVerificationResponse.failure("이미 인증된 이메일입니다"));
            }

            // 이메일 인증 완료 처리
            customer.setEmailVerified(true);
            customer.setEmailVerificationToken(null);
            customer.setEmailVerificationExpires(null);
            customersRepository.save(customer);

            log.info("이메일 인증 완료: {}", customer.getId());

            return ResponseEntity.ok(EmailVerificationResponse.success(customer.getId()));

        } catch (Exception e) {
            log.error("이메일 인증 처리 중 오류 발생", e);
            return ResponseEntity.internalServerError()
                    .body(EmailVerificationResponse.failure("서버 오류가 발생했습니다"));
        }
    }

    /**
     * 이메일 인증 재발송
     * @param email 재발송할 이메일
     * @return 재발송 결과
     */

    // 이메일 인증 재발송
    @PostMapping("/resend")
    public ResponseEntity<EmailVerificationResponse> resendVerificationEmail(@RequestParam String email) {
        try {
            log.info("이메일 인증 재발송 요청: {}", email);

            // 이메일로 사용자 찾기
            Optional<CustomersEntity> customerOpt = customersRepository.findById(email);
            if (customerOpt.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(EmailVerificationResponse.failure("존재하지 않는 이메일입니다"));
            }

            CustomersEntity customer = customerOpt.get();

            // 이미 인증된 사용자인지 확인
            if (customer.getEmailVerified()) {
                return ResponseEntity.badRequest()
                        .body(EmailVerificationResponse.failure("이미 인증된 이메일입니다"));
            }

            // 새 인증 코드 생성 (UUID 대신 6자리 숫자 사용)
            String newCode = emailService.generateVerificationCode(); 
            LocalDateTime expires = LocalDateTime.now().plusMinutes(5); // 만료 시간을 5분으로 설정

            // 코드 업데이트
            customer.setEmailVerificationToken(newCode); 
            customer.setEmailVerificationExpires(expires);
            customersRepository.save(customer);

            // 이메일 재발송
            log.info("이메일 인증 코드 재생성: {} - 코드: {}", email, newCode);
            boolean emailSent = emailService.sendVerificationEmail(email, newCode);
            if (!emailSent) {
                return ResponseEntity.internalServerError()
                        .body(EmailVerificationResponse.failure("이메일 발송에 실패했습니다"));
            }

            log.info("이메일 인증 재발송 완료: {}", email);

            return ResponseEntity.ok(EmailVerificationResponse.builder()
                    .success(true)
                    .message("인증 이메일이 재발송되었습니다")
                    .email(email)
                    .build());

        } catch (Exception e) {
            log.error("이메일 재발송 처리 중 오류 발생", e);
            return ResponseEntity.internalServerError()
                    .body(EmailVerificationResponse.failure("서버 오류가 발생했습니다"));
        }
    }

    /**
     * 이메일 인증 상태 확인
     * @param email 확인할 이메일
     * @return 인증 상태
     */

    // 이메일 인증 상태 확인
    @GetMapping("/status")
    public ResponseEntity<EmailVerificationResponse> getVerificationStatus(@RequestParam String email) {
        try {
            Optional<CustomersEntity> customerOpt = customersRepository.findById(email);
            if (customerOpt.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(EmailVerificationResponse.failure("존재하지 않는 이메일입니다"));
            }

            CustomersEntity customer = customerOpt.get();
            boolean isVerified = customer.getEmailVerified();

            return ResponseEntity.ok(EmailVerificationResponse.builder()
                    .success(isVerified)
                    .message(isVerified ? "인증된 이메일입니다" : "인증되지 않은 이메일입니다")
                    .email(email)
                    .build());

        } catch (Exception e) {
            log.error("이메일 인증 상태 확인 중 오류 발생", e);
            return ResponseEntity.internalServerError()
                    .body(EmailVerificationResponse.failure("서버 오류가 발생했습니다"));
        }
    }
}