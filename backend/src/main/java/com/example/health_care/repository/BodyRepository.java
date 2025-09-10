package com.example.health_care.repository;

import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
import com.example.health_care.entity.BodyEntity;

public interface BodyRepository extends JpaRepository<BodyEntity, Long> {
    // 고객 ID(customer_id)로 body 엔티티를 찾아오는 메서드
    List<BodyEntity> findByCustomerId(String customerId);
     // 최신 1건 (가장 큰 idx = 가장 최근이라고 가정)
    Optional<BodyEntity> findTopByCustomer_IdxOrderByIdxDesc(Long customerIdx);
    // 이력 전체 (최신순)
    List<BodyEntity> findByCustomer_IdxOrderByIdxDesc(Long customerIdx);

    // 체중 히스토리 조회 (최신순)
    List<BodyEntity> findByCustomer_IdxOrderByRecordDateDesc(Long customerIdx);
}
