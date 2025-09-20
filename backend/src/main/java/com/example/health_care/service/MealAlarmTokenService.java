package com.example.health_care.service;

import java.util.List;

import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.example.health_care.dto.MealAlarmTokenRequest;
import com.example.health_care.entity.CustomersEntity;
import com.example.health_care.entity.MealAlarmTokensEntity;
import com.example.health_care.repository.CustomersRepository;
import com.example.health_care.repository.MealAlarmTokenRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class MealAlarmTokenService {

    private final MealAlarmTokenRepository mealAlarmTokenRepository;
    private final CustomersRepository customersRepository;

    // 토큰 등록
    public void registerToken(String customerId, MealAlarmTokenRequest request) {

        CustomersEntity customer = customersRepository.findById(customerId)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다"));

        // 중복 토큰 체크
        Long customerIdx = Long.parseLong(customerId);
        if (!mealAlarmTokenRepository.findByCustomer_IdxAndToken(customerIdx, request.getToken()).isEmpty()) {
            throw new RuntimeException("이미 등록된 토큰입니다");
        }
        // 토큰 저장
        MealAlarmTokensEntity entity = MealAlarmTokensEntity.builder()
                .customer(customer)
                .token(request.getToken())
                .platform(request.getPlatform())
                .build();

        mealAlarmTokenRepository.save(entity);
        log.info("토큰 등록 완료 - 사용자: {}", customerId);

    }

    // 토큰 조회
    public List<MealAlarmTokensEntity> getTokensByCustomer(String customerId) {

        CustomersEntity customer = customersRepository.findById(customerId)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다"));

        // 사용자의 모든 토큰 조회
        return mealAlarmTokenRepository.findByCustomer_Idx(customer.getIdx());
    }

    // 토큰 삭제
    public void deleteToken(String customerId, String token) {
        CustomersEntity customer = customersRepository.findById(customerId)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다"));

        // 토큰 삭제
        // 사용자의 해당 토큰 존재 확인
        List<MealAlarmTokensEntity> tokens = mealAlarmTokenRepository.findByCustomer_IdxAndToken(customer.getIdx(),
                token);

        if (tokens.isEmpty()) { // 빈 토큰 일 때
            throw new RuntimeException("토큰을 찾을 수 없습니다.");
        } else { // 토큰이 있을 땐 삭제진행
            MealAlarmTokensEntity tokenEntity = tokens.get(0);
            mealAlarmTokenRepository.delete(tokenEntity);
            log.info("토큰 삭제 완료 - 사용자: {}", customerId);
        }

    }

}