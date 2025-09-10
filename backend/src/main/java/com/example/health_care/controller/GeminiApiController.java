// src/main/java/com/example/health_care/controller/GeminiApiController.java
package com.example.health_care.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.example.health_care.service.GeminiApiService;
import com.example.health_care.entity.GeminiPrompts; // 프롬프트 상수 클래스 임포트

@RestController
@RequestMapping("/api/gemini")
public class GeminiApiController {

    private final GeminiApiService geminiApiService;

    public GeminiApiController(GeminiApiService geminiApiService) {
        this.geminiApiService = geminiApiService;
    }

    // 프론트엔드에서 보낼 요청 본문
    public static class AnalyzeRequest {
        public String base64Image;
        public String action; // ✅ 프롬프트 대신 어떤 작업을 수행할지 명시
    }

    @PostMapping("/analyze-food")
    public String analyzeFood(@RequestBody AnalyzeRequest request) {
        String prompt;
        // 요청된 action에 따라 프롬프트 선택
        switch (request.action) {
            case "classify":
                prompt = GeminiPrompts.CLASSIFY_PROMPT;
                break;
            case "packaged":
                prompt = GeminiPrompts.PACKAGED_PROMPT;
                break;
            case "prepared":
                prompt = GeminiPrompts.PREPARED_PROMPT;
                break;
            default:
                // 기본값 또는 오류 처리
                throw new IllegalArgumentException("Invalid action: " + request.action);
        }
        return geminiApiService.analyzeFoodImage(request.base64Image, prompt);
    }
}