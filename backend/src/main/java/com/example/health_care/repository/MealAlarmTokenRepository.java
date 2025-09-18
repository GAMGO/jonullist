package com.example.health_care.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.health_care.entity.MealAlarmTokensEntity;

@Repository
public interface MealAlarmTokenRepository extends JpaRepository<MealAlarmTokensEntity, Long> {

    // 사용자별 모든 토큰 조회 : 알림 발송 시 사용자의 모든 기기 토큰 가져오기
    List<MealAlarmTokensEntity> findByCustomer_Idx(Long customerIdx);

    // 플랫폼별 토큰 조회 : android/ios 별로 다른 알림 발송
    List<MealAlarmTokensEntity> findByCustomer_IdxAndPlatform(Long customerIdx, String platform);

    // 특정 토큰 조회 : 토큰 중복 방지, 업데이트 시 사용
    List<MealAlarmTokensEntity> findByCustomer_IdxAndToken(Long customerIdx, String token);

    // 토큰으로 사용자 찾기 : 푸시 발송 실패 시 사용자 식별
    Optional<MealAlarmTokensEntity> findByToken(String token);
}
