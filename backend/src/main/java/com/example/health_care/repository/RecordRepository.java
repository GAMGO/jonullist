package com.example.health_care.repository;

import java.util.Date;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.example.health_care.entity.RecordEntity;

public interface RecordRepository extends JpaRepository<RecordEntity, Long> {

    // 고객 ID(customer_id)로 record 엔티티를 찾아오는 메서드
    List<RecordEntity> findByCustomerId(String customerId);

    // 최신 1건 (가장 큰 idx = 가장 최근이라고 가정)
    Optional<RecordEntity> findTopByCustomer_IdxOrderByIdxDesc(Long customerIdx);

    // 이력 전체 (최신순)
    List<RecordEntity> findByCustomer_IdxOrderByIdxDesc(Long customerIdx);

    // 특정 날짜 식단 조회
    List<RecordEntity> findByCustomer_IdxAndRecordDate(Long customerIdx, Date recordDate);
}
