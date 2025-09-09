package com.example.health_care.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.health_care.entity.RecoveryEntity;
import com.example.health_care.entity.RecoveryQuestionCode;

public interface RecoveryRepository extends JpaRepository<RecoveryEntity, Long> {
    List<RecoveryEntity> findByCustomerId(Long customerId);
    Optional<RecoveryEntity> findByCustomerIdAndCode(Long customerId, RecoveryQuestionCode code);
}
