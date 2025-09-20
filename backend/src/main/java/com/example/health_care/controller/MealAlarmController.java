package com.example.health_care.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.health_care.dto.MealAlarmTimeRequest;
import com.example.health_care.dto.MealAlarmTokenRequest;
import com.example.health_care.entity.MealAlarmSettingsEntity;
import com.example.health_care.entity.MealAlarmTokensEntity;
import com.example.health_care.service.MealAlarmSettingsService;
import com.example.health_care.service.MealAlarmTokenService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 식사 알림 관련 REST API 컨트롤러
 * - 알림 설정 관리 (CRUD)
 * - 푸시 토큰 관리 (등록, 조회, 삭제)
 * - 푸시 알림 발송 (개별, 브로드캐스트)
 */
@RestController
@RequestMapping("/api/alarm")
@RequiredArgsConstructor
@Slf4j
public class MealAlarmController {

    private final MealAlarmTokenService tokenService;
    private final MealAlarmSettingsService settingsService;

    // ==========================================
    // 알림 설정 관리 API
    // ==========================================

    /**
     * 식사 알림 시간 설정 저장
     * @param authentication 인증 정보 (사용자 ID 추출용)
     * @param request 알림 시간 설정 데이터
     * @return 저장 결과
     */
    @PostMapping("/settings")
    public ResponseEntity<Map<String, Object>> saveTimeSettings(
            Authentication authentication,
            @RequestBody MealAlarmTimeRequest request) {
        
        String customerId = authentication.getName();
        log.info("식사 알림 설정 저장 요청 - 사용자: {}", customerId);
        
        try {
            settingsService.saveTimeSettings(customerId, request);
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "식사 알림 설정이 저장되었습니다."
            ));
        } catch (Exception e) {
            log.error("알림 설정 저장 실패 - 사용자: {}, 에러: {}", customerId, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "status", "error",
                "message", e.getMessage()
            ));
        }
    }

    /**
     * 식사 알림 시간 설정 조회
     * @param authentication 인증 정보
     * @return 사용자의 알림 설정 목록
     */
    @GetMapping("/settings")
    public ResponseEntity<List<MealAlarmSettingsEntity>> getTimeSettings(Authentication authentication) {
        String customerId = authentication.getName();
        log.info("식사 알림 설정 조회 요청 - 사용자: {}", customerId);
        
        try {
            List<MealAlarmSettingsEntity> settings = settingsService.getTimeSettings(customerId);
            return ResponseEntity.ok(settings);
        } catch (Exception e) {
            log.error("알림 설정 조회 실패 - 사용자: {}, 에러: {}", customerId, e.getMessage());
            return ResponseEntity.badRequest().body(List.of());
        }
    }

    /**
     * 식사 알림 시간 설정 수정
     * @param authentication 인증 정보
     * @param request 수정할 알림 시간 설정 데이터
     * @return 수정 결과
     */
    @PutMapping("/settings")
    public ResponseEntity<Map<String, Object>> updateTimeSettings(
            Authentication authentication,
            @RequestBody MealAlarmTimeRequest request) {
        
        String customerId = authentication.getName();
        log.info("식사 알림 설정 수정 요청 - 사용자: {}", customerId);
        
        try {
            settingsService.updateTimeSettings(customerId, request);
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "식사 알림 설정이 수정되었습니다."
            ));
        } catch (Exception e) {
            log.error("알림 설정 수정 실패 - 사용자: {}, 에러: {}", customerId, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "status", "error",
                "message", e.getMessage()
            ));
        }
    }

    // ==========================================
    // 푸시 토큰 관리 API
    // ==========================================

    /**
     * 푸시 알림 토큰 등록
     * @param authentication 인증 정보
     * @param request 토큰 등록 데이터 (토큰, 플랫폼)
     * @return 등록 결과
     */
    @PostMapping("/tokens")
    public ResponseEntity<Map<String, Object>> registerToken(
            Authentication authentication,
            @RequestBody MealAlarmTokenRequest request) {
        
        String customerId = authentication.getName();
        log.info("푸시 토큰 등록 요청 - 사용자: {}, 플랫폼: {}", customerId, request.getPlatform());
        
        try {
            tokenService.registerToken(customerId, request);
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "푸시 토큰이 등록되었습니다."
            ));
        } catch (Exception e) {
            log.error("토큰 등록 실패 - 사용자: {}, 에러: {}", customerId, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "status", "error",
                "message", e.getMessage()
            ));
        }
    }

    /**
     * 사용자의 푸시 토큰 목록 조회
     * @param authentication 인증 정보
     * @return 사용자의 토큰 목록
     */
    @GetMapping("/tokens")
    public ResponseEntity<List<MealAlarmTokensEntity>> getTokens(Authentication authentication) {
        String customerId = authentication.getName();
        log.info("푸시 토큰 조회 요청 - 사용자: {}", customerId);
        
        try {
            List<MealAlarmTokensEntity> tokens = tokenService.getTokensByCustomer(customerId);
            return ResponseEntity.ok(tokens);
        } catch (Exception e) {
            log.error("토큰 조회 실패 - 사용자: {}, 에러: {}", customerId, e.getMessage());
            return ResponseEntity.badRequest().body(List.of());
        }
    }

    /**
     * 푸시 알림 토큰 삭제
     * @param authentication 인증 정보
     * @param token 삭제할 토큰
     * @return 삭제 결과
     */
    @DeleteMapping("/tokens")
    public ResponseEntity<Map<String, Object>> deleteToken(
            Authentication authentication,
            @RequestParam String token) {
        
        String customerId = authentication.getName();
        log.info("푸시 토큰 삭제 요청 - 사용자: {}, 토큰: {}", customerId, token.substring(0, Math.min(20, token.length())) + "...");
        
        try {
            tokenService.deleteToken(customerId, token);
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "푸시 토큰이 삭제되었습니다."
            ));
        } catch (Exception e) {
            log.error("토큰 삭제 실패 - 사용자: {}, 에러: {}", customerId, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                "status", "error",
                "message", e.getMessage()
            ));
        }
    }

}