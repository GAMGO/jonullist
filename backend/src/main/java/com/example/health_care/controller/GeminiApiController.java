package com.example.health_care.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.example.health_care.service.GeminiApiService;

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
        public String promptText;
    }

    @PostMapping("/analyze-food")
    public String analyzeFood(@RequestBody AnalyzeRequest request) {
        // 프롬프트는 백엔드에서 생성하거나, 프론트엔드에서 받아와도 됩니다.
        // 여기서는 예시로 'classifyPrompt()'를 사용합니다.
        String prompt = "너는 음식 사진 1장을 보고 아래 JSON으로만 응답한다. ..."; // 실제 프롬프트 내용으로 교체
        return geminiApiService.analyzeFoodImage(request.base64Image, prompt);
    }
}