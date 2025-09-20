package com.example.health_care.repository;

import com.example.health_care.entity.CustomersEntity;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomersRepository extends JpaRepository<CustomersEntity, Long> {
     
     Optional<CustomersEntity> findById(String id);

     boolean existsById(String id);

     // 이메일 인증 토큰으로 사용자 조회
     Optional<CustomersEntity> findByEmailVerificationToken(String token);

    Optional<CustomersEntity> findByIdxAndGender(Long idx, String gender);
}
