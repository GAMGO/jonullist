package com.example.health_care.service;

import java.util.Date;
import java.util.List;
import java.util.Optional;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.health_care.dto.BodyRequest;
import com.example.health_care.dto.CustomersProfileDTO;
import com.example.health_care.dto.SignupRequest;
import com.example.health_care.dto.UpdateAccountRequest;
import com.example.health_care.entity.BodyEntity;
import com.example.health_care.entity.CustomersEntity;
import com.example.health_care.entity.GoalEntity;
import com.example.health_care.entity.RecordEntity;
import com.example.health_care.repository.BodyRepository;
import com.example.health_care.repository.CustomersRepository;
import com.example.health_care.repository.GoalRepository;
import com.example.health_care.repository.RecordRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RequiredArgsConstructor
@Service
public class CustomersService implements UserDetailsService {

        private final CustomersRepository customersRepository;
        private final PasswordEncoder passwordEncoder;
        private final BodyRepository bodyRepository;
        private final GoalRepository goalRepository;
        private final RecordRepository recordRepository;

        @Transactional
        public CustomersEntity signup(SignupRequest req) {
                log.debug("[SIGNUP:SERVICE] existsById? id={}", req.getId()); // log 확인
                if (customersRepository.existsById(req.getId())) {
                        log.warn("[SIGNUP:SERVICE] duplicate id={}", req.getId());
                        throw new IllegalArgumentException("이미 존재하는 ID입니다.");
                }

                CustomersEntity user = CustomersEntity.builder()
                                .id(req.getId())
                                .password(passwordEncoder.encode(req.getPassword())) // 비밀번호 암호화
                                .weight(req.getWeight())
                                .age(req.getAge())
                                .gender(req.getGender())
                                .height(req.getHeight())
                                .build();

                CustomersEntity savedUser = customersRepository.save(user);

                BodyEntity bodyEntity = BodyEntity.builder()
                                .customer(savedUser)
                                .weight(savedUser.getWeight())
                                .height(savedUser.getHeight())
                                .age(savedUser.getAge())
                                .gender(savedUser.getGender())
                                .recordDate(new Date())
                                .build();

                bodyRepository.save(bodyEntity);

                return savedUser;
        }

        @Override
        public UserDetails loadUserByUsername(String id) throws UsernameNotFoundException {
                CustomersEntity user = customersRepository.findById(id)
                                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다 : " + id));

                return org.springframework.security.core.userdetails.User.builder()
                                .username(user.getId())
                                .password(user.getPassword())
                                .roles("USER")
                                .build();
        }

        @Transactional(readOnly = true)
        public CustomersProfileDTO getCustomerProfile(String customerId) {
                // 1. 고객 기본 정보 조회
                CustomersEntity customer = customersRepository.findById(customerId)
                                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다 : " + customerId));

                // 2. 고객의 idx를 사용하여 목표 정보 조회
                Optional<GoalEntity> goal = goalRepository.findTopByCustomer_IdxOrderByIdxDesc(customer.getIdx());

                // 3. 두 정보를 합쳐 DTO로 빌드하여 반환
                return CustomersProfileDTO.builder()
                                .id(customer.getId())
                                .weight(customer.getWeight())
                                .age(customer.getAge())
                                .gender(customer.getGender())
                                .height(customer.getHeight())
                                .targetWeight(goal.map(GoalEntity::getTargetWeight).orElse(null))
                                .targetCalories(goal.map(GoalEntity::getTargetCalories).orElse(null))
                                .build();
        }

        @Transactional
        public void saveBodyInfo(String customerId, BodyRequest bodyRequest) {
                // 1. customerId로 고객 엔티티를 찾음
                CustomersEntity customer = customersRepository.findById(customerId)
                                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));

                // 2. BodyRequest DTO를 BodyEntity로 변환
                BodyEntity bodyEntity = BodyEntity.builder()
                                .customer(customer)
                                .targetWeight(bodyRequest.getTargetWeight())
                                .targetCalories(bodyRequest.getTargetCalories())
                                .weight(bodyRequest.getWeight())
                                .age(bodyRequest.getAge())
                                .gender(bodyRequest.getGender())
                                .height(bodyRequest.getHeight()) // 형 변환된 값 사용
                                .inbody(bodyRequest.getInbody())
                                .recordDate(new Date()) // 현재 날짜를 기록
                                .build();

                // 3. Repository를 사용하여 데이터베이스에 저장
                bodyRepository.save(bodyEntity);
        }

        @Transactional
        public void updateProfileAndSaveGoal(String customerId, UpdateAccountRequest req) {
                // 1. 고객 엔티티를 찾아서 업데이트
                CustomersEntity customer = customersRepository.findById(customerId)
                                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));

                // DTO에서 받은 데이터로 Customers 테이블의 정보 업데이트
                Optional.ofNullable(req.getWeight()).ifPresent(customer::setWeight);
                Optional.ofNullable(req.getHeight()).ifPresent(customer::setHeight);
                Optional.ofNullable(req.getAge()).ifPresent(customer::setAge);
                Optional.ofNullable(req.getGender()).ifPresent(customer::setGender);

                // 2. 비밀번호 변경
                if (req.getNewPassword() != null && !req.getNewPassword().isBlank()) {
                        customer.setPassword(passwordEncoder.encode(req.getNewPassword()));
                }

                customersRepository.save(customer);

                // 3. 목표 정보가 DTO에 포함된 경우
                if (req.getTargetWeight() != null || req.getTargetCalories() != null) {
                        // ⭐ 1. GOAL 테이블에 새로운 목표 기록을 생성하고 저장
                        GoalEntity goalEntity = GoalEntity.builder()
                                        .customer(customer)
                                        .targetWeight(req.getTargetWeight())
                                        .targetCalories(req.getTargetCalories())
                                        .recordDate(new Date()) // record_date를 사용하여 목표 생성
                                        .build();
                        goalRepository.save(goalEntity);

                        // ⭐ 2. BODY 테이블에 현재 신체 정보와 목표를 함께 기록
                        BodyEntity bodyEntity = BodyEntity.builder()
                                        .customer(customer)
                                        .weight(req.getWeight())
                                        .height(req.getHeight())
                                        .age(req.getAge())
                                        .gender(req.getGender())
                                        .targetWeight(req.getTargetWeight())
                                        .targetCalories(req.getTargetCalories())
                                        .recordDate(new Date())
                                        .build();
                        bodyRepository.save(bodyEntity);

                        // ⭐ 3. RECORD 테이블에 초기 목표 기록
                        RecordEntity recordEntity = RecordEntity.builder()
                                        .customer(customer)
                                        .recordDate(new Date())
                                        .targetWeight(req.getTargetWeight())
                                        .targetCalories(req.getTargetCalories())
                                        // 아침/점심/저녁 칼로리 정보는 아직 없으므로 NULL로 둡니다.
                                        .caloriesM(null)
                                        .caloriesL(null)
                                        .caloriesD(null)
                                        .build();
                        recordRepository.save(recordEntity);
                }
        }

        // >>> [ADDED] 복구/프로필 등에서 공용으로 쓰는 비밀번호 변경 유틸
        @Transactional
        public void updatePassword(String customerId, String newPassword) {
                CustomersEntity user = customersRepository.findById(customerId)
                                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다 : " + customerId));
                user.setPassword(passwordEncoder.encode(newPassword));
                customersRepository.save(user);
        }

        // 체중 히스토리 조회 메소드
        @Transactional(readOnly = true)
        public List<BodyEntity> getBodyHistory(String customerId) {
                // 1단계: 이메일로 CUSTOMERS 엔티티 조회 (idx 얻기)
                CustomersEntity customer = customersRepository.findById(customerId)
                                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));

                // 2단계: 얻은 idx로 BODY 테이블 조회
                return bodyRepository.findByCustomer_IdxOrderByRecordDateDesc(customer.getIdx());
        }

}
