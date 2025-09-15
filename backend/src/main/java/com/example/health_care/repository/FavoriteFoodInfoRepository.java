package com.example.health_care.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.health_care.entity.FavoriteFoodInfoEntity;

public interface FavoriteFoodInfoRepository extends JpaRepository<FavoriteFoodInfoEntity, Long> {

    // 사용자별 즐겨찾기 조회 (최신순)
    List<FavoriteFoodInfoEntity> findByCustomer_IdxOrderByCreatedAtDesc(Long customerIdx);
    
    // 즐겨찾기 중복 체크
    boolean existsByCustomer_IdxAndFoodNameAndCalories(Long customerIdx, String foodName, Integer calories);

    // 사용자별 즐겨찾기 개수 조회
    long countByCustomer_Idx(Long customerIdx);

    // 50개 제한 시 가장 오래된 즐겨찾기 삭제를 위한 조회 (오래된순)
    List<FavoriteFoodInfoEntity> findByCustomer_IdxOrderByCreatedAtAsc(Long customerIdx);
}
