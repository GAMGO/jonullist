package com.example.health_care.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.health_care.dto.FavoriteFoodInfoRequest;
import com.example.health_care.dto.FavoriteFoodInfoResponse;
import com.example.health_care.service.FavoriteFoodInfoService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping("/api/favorite")
public class FavoriteFoodInfoController {
    
    private final FavoriteFoodInfoService favoriteFoodInfoService;

    // 즐겨찾기 목록 조회
    @GetMapping
    public ResponseEntity<List<FavoriteFoodInfoResponse>> getFavorites(Authentication authentication) {
        try {
            String customerId = authentication.getName();
            List<FavoriteFoodInfoResponse> favorites = favoriteFoodInfoService.getFavorites(customerId);
            return ResponseEntity.ok(favorites);
        } catch (Exception e) {
            log.error("즐겨찾기 목록 조회 중 오류 발생", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // 즐겨찾기 추가
    @PostMapping
    public ResponseEntity<String> addFavorite(
            @Valid @RequestBody FavoriteFoodInfoRequest request,
            Authentication authentication) {
        try {
            String customerId = authentication.getName();
            favoriteFoodInfoService.addFavorite(customerId, request);
            return ResponseEntity.ok("즐겨찾기 추가 완료");
        } catch (IllegalArgumentException e) {
            log.warn("즐겨찾기 추가 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            log.error("즐겨찾기 추가 중 오류 발생", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // 즐겨찾기 삭제
    @DeleteMapping("/{idx}")
    public ResponseEntity<String> removeFavorite(
            @PathVariable("idx") Long idx,
            Authentication authentication) {
        try {
            String customerId = authentication.getName();
            favoriteFoodInfoService.removeFavorite(customerId, idx);
            return ResponseEntity.ok("즐겨찾기 삭제 완료");
        } catch (IllegalArgumentException e) {
            log.warn("즐겨찾기 삭제 실패: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            log.error("즐겨찾기 삭제 중 오류 발생", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
