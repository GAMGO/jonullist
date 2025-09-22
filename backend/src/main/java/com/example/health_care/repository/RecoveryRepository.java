package com.example.health_care.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.health_care.entity.RecoveryEntity;
import com.example.health_care.entity.RecoveryQuestionCode;

import jakarta.transaction.Transactional;

public interface RecoveryRepository extends JpaRepository<RecoveryEntity, Long> {
    List<RecoveryEntity> findByCustomerId(Long customerId);
    List<RecoveryEntity> findByNameAndBirth(String name, String birth);
    Optional<RecoveryEntity> findByCustomerIdAndCode(Long customerId, RecoveryQuestionCode code);
    // ✅ 수정: @Param 어노테이션 추가
    @Modifying
    @Transactional
    @Query("DELETE FROM RecoveryEntity r WHERE r.customerId = :customerId")
    void deleteAllByCustomerId(@Param("customerId") Long customerId);
}
