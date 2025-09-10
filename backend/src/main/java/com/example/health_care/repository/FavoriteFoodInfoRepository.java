package com.example.health_care.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.health_care.entity.FavoriteFoodInfoEntity;

public interface FavoriteFoodInfoRepository extends JpaRepository<FavoriteFoodInfoEntity, Long> {

    // 사용자별 즐겨찾기 목록 조회
    List<FavoriteFoodInfoEntity> findByCustomer_IdxOrderByCreatedAtDesc(Long customerIdx);
    
    // 즐겨찾기 중복 체크
    boolean existsByCustomer_IdxAndFoodNameAndCalories(Long customerIdx, String foodName, Integer calories);

    // 사용자별 즐겨찾기 개수 조회
    long countByCustomer_Idx(Long customerIdx);
}
