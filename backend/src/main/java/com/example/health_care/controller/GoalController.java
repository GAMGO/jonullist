package com.example.health_care.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.health_care.dto.CustomersProfileDTO;
import com.example.health_care.dto.UpdateAccountRequest;
import com.example.health_care.entity.BodyEntity;
import com.example.health_care.service.CustomersService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping("/body")
public class GoalController {

    private final CustomersService customersService;

    // 프론트엔드에서 GET /body 요청이 오면 이 메서드가 처리
    @GetMapping
    public ResponseEntity<CustomersProfileDTO> getCustomerInfo(Authentication authentication) {
        String customerId = authentication.getName();

        CustomersProfileDTO cpd = customersService.getCustomerProfile(customerId);

        if (cpd != null) {
            return ResponseEntity.ok(cpd);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    public ResponseEntity<String> handleInitialSetup(
            @RequestBody UpdateAccountRequest updateRequest,
            Authentication authentication) {

        log.info("Received POST request for initial setup with data: {}", updateRequest);
        String customerId = authentication.getName();

        // 서비스 메서드 호출: 기존 프로필과 새로운 목표를 동시에 처리
        customersService.updateProfileAndSaveGoal(customerId, updateRequest);

        return ResponseEntity.ok("목표 설정 및 프로필 업데이트 완료");
    }

    // 체중 히스토리 조회
    @GetMapping("/history")
    public ResponseEntity<List<BodyEntity>> getBodyHistory(Authentication authentication) {
        String customerId = authentication.getName();
        List<BodyEntity> bodyHistory = customersService.getBodyHistory(customerId);
        return ResponseEntity.ok(bodyHistory);

    }
}