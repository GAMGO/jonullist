package com.example.health_care.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.health_care.entity.MealAlarmSettingsEntity;
import java.util.List;
import java.util.Optional;

@Repository
public interface MealAlarmSettingsRepository extends JpaRepository<MealAlarmSettingsEntity, Long> {

    // 사용자별 알림 설정 조회
    Optional<MealAlarmSettingsEntity> findByCustomer_Idx(Long customerIdx);

    // 알림 활성화된 사용자들 조회
    List<MealAlarmSettingsEntity> findByAlarmEnabled(Boolean alarmEnabled);
}

