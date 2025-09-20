package com.example.health_care.service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.example.health_care.dto.MealAlarmSendRequest;
import com.example.health_care.entity.MealAlarmSettingsEntity;
import com.example.health_care.entity.MealAlarmTokensEntity;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 식사 알림 스케줄러 서비스
 * - 설정된 시간에 자동으로 푸시 알림 발송
 * - 아침/점심/저녁 식사 시간별 스케줄링
 * - 알림 활성화된 사용자만 대상으로 발송
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MealAlarmSchedulerService {

    private final MealAlarmSettingsService settingsService;
    private final MealAlarmTokenService tokenService;
    private final MealAlarmPushService pushService;

    // ==========================================
    // 스케줄러 설정 (매분마다 실행)
    // ==========================================

    /**
     * 아침 식사 알림 스케줄러
     * 매분마다 실행되어 설정된 아침 시간과 일치하는 사용자에게 알림 발송
     */
    @Scheduled(fixedRate = 60000) // 60초마다 실행 (1분)
    public void sendMorningMealAlarm() {
        sendMealAlarmByType("morning", "아침 식사 시간입니다!", "건강한 아침을 챙겨드세요 🌅");
    }

    /**
     * 점심 식사 알림 스케줄러
     * 매분마다 실행되어 설정된 점심 시간과 일치하는 사용자에게 알림 발송
     */
    @Scheduled(fixedRate = 60000) // 60초마다 실행 (1분)
    public void sendLunchMealAlarm() {
        sendMealAlarmByType("lunch", "점심 식사 시간입니다!", "맛있는 점심 드세요 🍽️");
    }

    /**
     * 저녁 식사 알림 스케줄러
     * 매분마다 실행되어 설정된 저녁 시간과 일치하는 사용자에게 알림 발송
     */
    @Scheduled(fixedRate = 60000) // 60초마다 실행 (1분)
    public void sendDinnerMealAlarm() {
        sendMealAlarmByType("dinner", "저녁 식사 시간입니다!", "편안한 저녁 식사 되세요 🌙");
    }

    // ==========================================
    // 알림 발송 로직
    // ==========================================

    /**
     * 식사 타입별 알림 발송 공통 로직
     * @param mealType 식사 타입 ("morning", "lunch", "dinner")
     * @param title 알림 제목
     * @param body 알림 내용
     */
    private void sendMealAlarmByType(String mealType, String title, String body) {
        try {
            // 현재 시간 확인
            LocalTime currentTime = LocalTime.now();
            String currentTimeStr = currentTime.format(DateTimeFormatter.ofPattern("HH:mm"));
            
            log.debug("식사 알림 스케줄러 실행 - 타입: {}, 현재 시간: {}", mealType, currentTimeStr);

            // 알림 활성화된 모든 사용자의 설정 조회
            List<MealAlarmSettingsEntity> activeSettings = settingsService.getActiveSettings();
            
            if (activeSettings.isEmpty()) {
                log.debug("알림 활성화된 사용자가 없습니다.");
                return;
            }

            log.info("식사 알림 스케줄러 - {} 시간 알림 발송 시작 (현재 시간: {}, 대상 사용자: {}명)", 
                    mealType, currentTimeStr, activeSettings.size());

            // 각 사용자별로 알림 발송 여부 확인 및 발송
            int sentCount = 0;
            for (MealAlarmSettingsEntity setting : activeSettings) {
                try {
                    // 알림 발송 조건 확인
                    if (shouldSendAlarm(setting, mealType, currentTime)) {
                        // 알림 발송
                        sendAlarmToUser(setting, mealType, title, body);
                        sentCount++;
                        log.debug("식사 알림 발송 완료 - 사용자: {}, 타입: {}", 
                                setting.getCustomer().getId(), mealType);
                    }
                } catch (Exception e) {
                    log.error("사용자별 알림 발송 실패 - 사용자: {}, 타입: {}, 에러: {}", 
                             setting.getCustomer().getId(), mealType, e.getMessage());
                }
            }

            log.info("식사 알림 스케줄러 완료 - 타입: {}, 발송된 알림: {}개", mealType, sentCount);
            
        } catch (Exception e) {
            log.error("식사 알림 스케줄러 실행 중 오류 발생 - 타입: {}, 에러: {}", mealType, e.getMessage(), e);
        }
    }

    /**
     * 특정 사용자에게 알림 발송 여부 확인
     * @param setting 사용자의 알림 설정
     * @param mealType 식사 타입
     * @param currentTime 현재 시간
     * @return 알림 발송 여부
     */
    private boolean shouldSendAlarm(MealAlarmSettingsEntity setting, String mealType, LocalTime currentTime) {
        // 알림이 비활성화된 경우 발송하지 않음
        if (!Boolean.TRUE.equals(setting.getAlarmEnabled())) {
            return false;
        }

        // 식사 타입별 시간 확인
        LocalTime targetTime = null;
        switch (mealType) {
            case "morning":
                targetTime = LocalTime.of(setting.getMorningHour(), setting.getMorningMinute());
                break;
            case "lunch":
                targetTime = LocalTime.of(setting.getLunchHour(), setting.getLunchMinute());
                break;
            case "dinner":
                targetTime = LocalTime.of(setting.getDinnerHour(), setting.getDinnerMinute());
                break;
            default:
                return false;
        }

        // 현재 시간이 설정된 시간과 일치하는지 확인 (분 단위까지)
        return currentTime.getHour() == targetTime.getHour() && 
               currentTime.getMinute() == targetTime.getMinute();
    }

    /**
     * 특정 사용자에게 알림 발송
     * @param setting 사용자의 알림 설정
     * @param mealType 식사 타입
     * @param title 알림 제목
     * @param body 알림 내용
     */
    private void sendAlarmToUser(MealAlarmSettingsEntity setting, String mealType, String title, String body) {
        try {
            // 사용자의 토큰 조회
            String customerId = setting.getCustomer().getId();
            List<MealAlarmTokensEntity> tokens = tokenService.getTokensByCustomer(customerId);
            
            if (tokens.isEmpty()) {
                log.debug("알림 발송 대상 사용자에게 토큰이 없음 - 사용자: {}", customerId);
                return;
            }

            // 푸시 메시지 구성
            Map<String, Object> data = new HashMap<>();
            data.put("mealType", mealType);
            data.put("userId", customerId);
            data.put("timestamp", System.currentTimeMillis());
            
            MealAlarmSendRequest request = MealAlarmSendRequest.builder()
                    .title(title)
                    .body(body)
                    .data(data)
                    .build();

            // 푸시 발송
            Map<String, Object> result = pushService.sendMealAlarmToUser(tokens, mealType, request);
            
            if (pushService.isPushSuccess(result)) {
                log.info("식사 알림 발송 성공 - 사용자: {}, 타입: {}", customerId, mealType);
            } else {
                log.warn("식사 알림 발송 실패 - 사용자: {}, 타입: {}, 결과: {}", customerId, mealType, result);
            }
            
        } catch (Exception e) {
            log.error("사용자별 알림 발송 중 오류 - 사용자: {}, 타입: {}, 에러: {}", 
                     setting.getCustomer().getId(), mealType, e.getMessage(), e);
        }
    }


}