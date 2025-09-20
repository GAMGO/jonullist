package com.example.health_care.service;

import java.util.List;
import java.util.Optional;

import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.example.health_care.dto.MealAlarmTimeRequest;
import com.example.health_care.entity.CustomersEntity;
import com.example.health_care.entity.MealAlarmSettingsEntity;
import com.example.health_care.repository.CustomersRepository;
import com.example.health_care.repository.MealAlarmSettingsRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class MealAlarmSettingsService {

    private final MealAlarmSettingsRepository mealAlarmSettingsRepository;
    private final CustomersRepository customersRepository;

    // 시간 설정 저장
    public void saveTimeSettings(String customerId, MealAlarmTimeRequest request) {
        CustomersEntity customer = customersRepository.findById(customerId)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다"));

        // 기존 설정 확인
        Optional<MealAlarmSettingsEntity> setting = mealAlarmSettingsRepository.findByCustomer_Idx(customer.getIdx());

        if (setting.isPresent()) {
            // 설정이 있으면 -> updateTimeSettings 실행
            throw new RuntimeException("이미 설정이 존재합니다. 수정하려면 updateTimeSettings를 사용하세요");

        } else {
            // 설정이 없으면 -> 새로 생성
            MealAlarmSettingsEntity newSetting = MealAlarmSettingsEntity.builder()
                    .customer(customer)
                    .morningHour(request.getMorningHour())
                    .morningMinute(request.getMorningMinute())
                    .lunchHour(request.getLunchHour())
                    .lunchMinute(request.getLunchMinute())
                    .dinnerHour(request.getDinnerHour())
                    .dinnerMinute(request.getDinnerMinute())
                    .alarmEnabled(request.getAlarmEnabled())
                    .build();

            mealAlarmSettingsRepository.save(newSetting);
            log.info("식사 알림 설정 저장 완료 - 사용자: {}", customerId);
        }

    }

    // 시간 설정 조회
    public List<MealAlarmSettingsEntity> getTimeSettings(String customerId) {
        CustomersEntity customer = customersRepository.findById(customerId)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다"));

        // 사용자의 모든 시간 설정 조회
        Optional<MealAlarmSettingsEntity> setting = mealAlarmSettingsRepository.findByCustomer_Idx(customer.getIdx());
        return setting.map(List::of).orElse(List.of());
    }

    // 시간 설정 수정
    public void updateTimeSettings(String customerId, MealAlarmTimeRequest request) {
        CustomersEntity customer = customersRepository.findById(customerId)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다"));

        // 기존 설정 조회
        Optional<MealAlarmSettingsEntity> existingSetting = mealAlarmSettingsRepository
                .findByCustomer_Idx(customer.getIdx());

        if (existingSetting.isEmpty()) {
            throw new RuntimeException("수정할 설정이 없습니다. 먼저 설정을 저장하세요.");
        }

        // 기존 설정 업데이트
        MealAlarmSettingsEntity setting = existingSetting.get();
        setting.setMorningHour(request.getMorningHour());
        setting.setMorningMinute(request.getMorningMinute());
        setting.setLunchHour(request.getLunchHour());
        setting.setLunchMinute(request.getLunchMinute());
        setting.setDinnerHour(request.getDinnerHour());
        setting.setDinnerMinute(request.getDinnerMinute());
        setting.setAlarmEnabled(request.getAlarmEnabled());

        // 저장
        mealAlarmSettingsRepository.save(setting);
        log.info("식사 알림 설정 수정 완료 - 사용자: {}", customerId);
    }
}