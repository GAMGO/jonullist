package com.example.health_care.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.health_care.dto.FavoriteFoodInfoRequest;
import com.example.health_care.dto.FavoriteFoodInfoResponse;
import com.example.health_care.entity.CustomersEntity;
import com.example.health_care.entity.FavoriteFoodInfoEntity;
import com.example.health_care.repository.CustomersRepository;
import com.example.health_care.repository.FavoriteFoodInfoRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class FavoriteFoodInfoService {
    
    private final CustomersRepository customersRepository;
    private final FavoriteFoodInfoRepository favoriteFoodInfoRepository;

    // 즐겨찾기 목록 조회
    @Transactional(readOnly = true)
    public List<FavoriteFoodInfoResponse> getFavorites(String customerId) {
        CustomersEntity customer = customersRepository.findById(customerId)
            .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));
        
         List<FavoriteFoodInfoEntity> entities = favoriteFoodInfoRepository
        .findByCustomer_IdxOrderByCreatedAtDesc(customer.getIdx());
    
    return entities.stream()
        .map(this::convertToResponse)
        .collect(Collectors.toList());
    }

    // 즐겨찾기 추가
    @Transactional
    public void addFavorite(String customerId, FavoriteFoodInfoRequest request) {
        CustomersEntity customer = customersRepository.findById(customerId)
            .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));
        
        // 중복 체크
        boolean exists = favoriteFoodInfoRepository.existsByCustomer_IdxAndFoodNameAndCalories(
            customer.getIdx(), request.getFood(), request.getCalories().intValue());
        
        if (exists) {
            throw new IllegalArgumentException("이미 즐겨찾기에 추가된 음식입니다.");
        }
        
        // 50개 제한 체크
        long count = favoriteFoodInfoRepository.countByCustomer_Idx(customer.getIdx());
        if (count >= 50) {
            // 가장 오래된 즐겨찾기 삭제
            List<FavoriteFoodInfoEntity> oldestFavorites = favoriteFoodInfoRepository
                .findByCustomer_IdxOrderByCreatedAtAsc(customer.getIdx());
            if (!oldestFavorites.isEmpty()) {
                favoriteFoodInfoRepository.delete(oldestFavorites.get(0));
            }
        }
        
        // 새 즐겨찾기 추가
        FavoriteFoodInfoEntity favorite = FavoriteFoodInfoEntity.builder()
            .customer(customer)
            .foodName(request.getFood())
            .calories(request.getCalories().intValue())
            .count(0)
            .createdAt(java.time.LocalDateTime.now())
            .build();
        
        favoriteFoodInfoRepository.save(favorite);
    }

    // 즐겨찾기 삭제
    @Transactional
    public void removeFavorite(String customerId, Long idx) {
        CustomersEntity customer = customersRepository.findById(customerId)
            .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));
        
        FavoriteFoodInfoEntity favorite = favoriteFoodInfoRepository.findById(idx)
            .orElseThrow(() -> new IllegalArgumentException("즐겨찾기를 찾을 수 없습니다."));
        
        // 본인 것만 삭제 가능
        if (!favorite.getCustomer().getIdx().equals(customer.getIdx())) {
            throw new IllegalArgumentException("본인의 즐겨찾기만 삭제할 수 있습니다.");
        }
        
        favoriteFoodInfoRepository.delete(favorite);
    }
    
    // Entity를 Response DTO로 변환
    private FavoriteFoodInfoResponse convertToResponse(FavoriteFoodInfoEntity entity) {
        return FavoriteFoodInfoResponse.builder()
            .idx(entity.getIdx())
            .food(entity.getFoodName())
            .calories(entity.getCalories().longValue())
            .createdAt(entity.getCreatedAt())
            .build();
    }
}
