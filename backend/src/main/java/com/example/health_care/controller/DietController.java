package com.example.health_care.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.health_care.dto.DietRequest;
import com.example.health_care.entity.RecordEntity;
import com.example.health_care.service.DietService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Slf4j
@RestController
@RequestMapping("/api/diet")
@RequiredArgsConstructor
public class DietController {
    private final DietService dietService;

    // 식단 저장
    @PostMapping("/save")
    public ResponseEntity<String> saveDietRecord(Authentication authentication, @RequestBody DietRequest request) {

        try {
            // 인증된 사용자 ID 추출
            String customerId = authentication.getName();

            // 서비스 호출
            dietService.saveDietRecord(customerId, request);

            // 성공 응답 (200 OK)
            return ResponseEntity.ok("식단 기록이 저장되었습니다.");

        } catch (Exception e) {
            log.error("식단 기록 저장 중 오류 발생", e);
            return ResponseEntity.badRequest().body("식단 기록 저장에 실패했습니다."); // 400 Bad Request
        }
    }

    // 식단 조회
    @GetMapping("/get")
    public ResponseEntity<RecordEntity> getDietRecord(Authentication authentication,
            @RequestParam("date") String date) {

        try {
            String customerId = authentication.getName();

            RecordEntity record = dietService.getDietRecord(customerId, date);

            return ResponseEntity.ok(record);
            
        } catch (Exception e) {
            log.error("식단 기록 조회 중 오류 발생", e);
            return ResponseEntity.badRequest().body(null);
        }
    }

    // 식단 삭제
    @DeleteMapping("/delete")
    // 파라미터 : 로그인 사용자 정보/날짜정보/식사타입/타임스탬프
    public ResponseEntity<String> DeleteDietRecord(Authentication authentication, @RequestParam("date") String date, @RequestParam("type") String type, @RequestParam("timestamp") Long timestamp) {

        try {
            String customerId = authentication.getName(); // 사용자 id 추출

            dietService.deleteMealItem(customerId, date, type, timestamp); // 서비스 호출

            return ResponseEntity.ok("식단 기록이 삭제되었습니다.");

        } catch (Exception e) {
            log.error("식단 기록 삭제 중 오류 발생", e);;
            return ResponseEntity.badRequest().body("식단 기록 삭제에 실패했습니다.");
        }
    }


}
