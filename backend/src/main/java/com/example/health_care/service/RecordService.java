package com.example.health_care.service;

import com.example.health_care.dto.RecordRequest;
import com.example.health_care.entity.CustomersEntity;
import com.example.health_care.entity.GoalEntity;
import com.example.health_care.entity.RecordEntity;
import com.example.health_care.repository.CustomersRepository;
import com.example.health_care.repository.GoalRepository;
import com.example.health_care.repository.RecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Date;
import java.util.List;
import java.util.Optional;

@Slf4j
@RequiredArgsConstructor
@Service
public class RecordService {

    private final CustomersRepository customersRepository;
    private final GoalRepository goalRepository;
    private final RecordRepository recordRepository;

    // 💡 일일 식단 기록을 저장하는 메서드
    @Transactional
    public void saveRecordInfo(String customerId, RecordRequest recordRequest) {
        CustomersEntity customer = customersRepository.findById(customerId)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));

        // 최신 목표 정보를 가져와서 RECORD 테이블에 함께 저장
        Optional<GoalEntity> latestGoal = goalRepository.findTopByCustomer_IdxOrderByIdxDesc(customer.getIdx());
        
        RecordEntity recordEntity = RecordEntity.builder()
                .customer(customer)
                .recordDate(new Date())
                .caloriesM(recordRequest.getCaloriesM())
                .caloriesL(recordRequest.getCaloriesL())
                .caloriesD(recordRequest.getCaloriesD())
                .targetWeight(latestGoal.map(GoalEntity::getTargetWeight).orElse(null))
                .targetCalories(latestGoal.map(GoalEntity::getTargetCalories).orElse(null))
                .build();

        recordRepository.save(recordEntity);
    }

    // 💡 일일 식단 기록 이력을 조회하는 메서드
    @Transactional(readOnly = true)
    public List<RecordEntity> getRecordHistory(String customerId) {
        CustomersEntity customer = customersRepository.findById(customerId)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));

        return recordRepository.findByCustomer_IdxOrderByIdxDesc(customer.getIdx());
    }
}