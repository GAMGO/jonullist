package com.example.health_care.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.example.health_care.dto.MealAlarmSendRequest;
import com.example.health_care.entity.MealAlarmTokensEntity;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
@Slf4j
public class MealAlarmPushService {

    // Expo Push 서비스용 WebClient 설정
    private final WebClient webClient = WebClient.builder()
            .baseUrl("https://exp.host")
            .build();

    /**
     * 단일 사용자에게 식사 알림 푸시 발송
     * @param tokens 사용자의 푸시 토큰 목록
     * @param mealType 식사 타입 ("morning", "lunch", "dinner")
     * @param request 푸시 메시지 내용 (제목, 내용, 추가 데이터)
     * @return 푸시 발송 결과
     */
    public Map<String, Object> sendMealAlarmToUser(List<MealAlarmTokensEntity> tokens, 
                                                   String mealType, 
                                                   MealAlarmSendRequest request) {
        log.info("식사 알림 푸시 발송 시작 - 타입: {}, 토큰 수: {}", mealType, tokens.size());
        
        // 토큰이 없으면 발송 불가
        if (tokens.isEmpty()) {
            log.warn("발송할 토큰이 없습니다.");
            return Map.of("status", "no-tokens", "message", "발송할 토큰이 없습니다.");
        }

        // Expo 토큰만 추출 (ExponentPushToken[...] 형태)
        List<String> expoTokens = tokens.stream()
                .map(MealAlarmTokensEntity::getToken)
                .filter(token -> token.startsWith("ExponentPushToken["))
                .distinct()
                .toList();

        if (expoTokens.isEmpty()) {
            log.warn("유효한 Expo 토큰이 없습니다.");
            return Map.of("status", "invalid-tokens", "message", "유효한 Expo 토큰이 없습니다.");
        }

        // 푸시 메시지 구성
        String title = request.getTitle();
        String body = request.getBody();
        Map<String, Object> data = request.getData() != null ? request.getData() : new HashMap<>();
        
        // 식사 타입 정보 추가
        data.put("mealType", mealType);
        data.put("timestamp", System.currentTimeMillis());

        // 푸시 발송
        Map<String, Object> result = sendExpoPush(expoTokens, title, body, data);
        
        log.info("식사 알림 푸시 발송 완료 - 결과: {}", result);
        return result;
    }


    /**
     * Expo Push 서비스로 실제 푸시 발송
     * @param expoTokens Expo 푸시 토큰 목록
     * @param title 푸시 제목
     * @param body 푸시 내용
     * @param data 추가 데이터
     * @return 발송 결과
     */
    private Map<String, Object> sendExpoPush(List<String> expoTokens, 
                                            String title, 
                                            String body, 
                                            Map<String, Object> data) {
        try {
            // Expo가 기대하는 메시지 배열 형태로 구성
            List<Map<String, Object>> messages = new ArrayList<>();
            
            for (String token : expoTokens) {
                Map<String, Object> message = new HashMap<>();
                message.put("to", token);                    // 수신자 토큰
                message.put("sound", "default");             // 기본 소리
                message.put("title", title);                 // 푸시 제목
                message.put("body", body);                   // 푸시 내용
                message.put("data", data);                   // 추가 데이터
                message.put("channelId", "default");         // Android 채널 ID
                message.put("priority", "high");             // 높은 우선순위 (헤드업 알림)
                
                messages.add(message);
            }

            // Expo Push API 호출 (한 번에 최대 100개까지 전송 가능)
            return webClient.post()
                    .uri("/--/api/v2/push/send")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(messages)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .onErrorResume(throwable -> {
                        // 에러 발생 시 에러 정보 반환
                        log.error("Expo Push 발송 실패: {}", throwable.getMessage());
                        Map<String, Object> errorResult = new HashMap<>();
                        errorResult.put("error", throwable.getMessage());
                        errorResult.put("status", "failed");
                        return Mono.just(errorResult);
                    })
                    .block(); // 동기적으로 결과 대기

        } catch (Exception e) {
            log.error("푸시 발송 중 예외 발생: {}", e.getMessage(), e);
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("error", e.getMessage());
            errorResult.put("status", "exception");
            return errorResult;
        }
    }

    /**
     * 푸시 발송 결과 검증
     * @param result 발송 결과
     * @return 성공 여부
     */
    public boolean isPushSuccess(Map<String, Object> result) {
        if (result == null) return false;
        
        // Expo Push 성공 응답 확인
        return result.containsKey("data") && 
               !result.containsKey("error") && 
               !result.containsKey("status");
    }
}