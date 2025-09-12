package com.example.health_care.controller;

import com.example.health_care.dto.GeminiRequest;
import com.example.health_care.entity.GeminiPrompts;
import com.example.health_care.service.GeminiService; // ✅ 수정: GeminiService 임포트
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/gemini")
public class GeminiController {

    private final GeminiService geminiService; // ✅ 수정: GeminiService 주입
    private final ObjectMapper mapper = new ObjectMapper();

    // ✅ 수정: GeminiClient 대신 GeminiService를 주입받음
    public GeminiController(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    private ResponseEntity<String> handleGeminiRequest(GeminiRequest request) {
        try {
            // ✅ 수정: 서비스로 API 호출 로직 위임
            String response = geminiService.callGeminiApi(request.getImageData(), request.getMimeType(), request.getPrompt());

            JsonNode root = mapper.readTree(response);
            String text = root.at("/candidates/0/content/parts/0/text").asText();

            // JSON 문자열만 추출
            if (text.startsWith("```json")) {
                int startIndex = text.indexOf('{');
                int endIndex = text.lastIndexOf('}');
                if (startIndex != -1 && endIndex != -1) {
                    text = text.substring(startIndex, endIndex + 1);
                }
            }

            JsonNode jsonResponse = mapper.readTree(text);
            ObjectNode mutableJsonResponse = mapper.createObjectNode();
            mutableJsonResponse.setAll((ObjectNode) jsonResponse);

            // ✅ 핵심 수정: dish 필드가 없는 경우 기본값 설정
            if (!mutableJsonResponse.has("dish")) {
                mutableJsonResponse.put("dish", "알 수 없는 음식");
            }

            // ✅ 수정: 반환 전에 calories가 없으면 0으로 설정
            if (!mutableJsonResponse.has("calories")) {
                mutableJsonResponse.put("calories", 0);
            }

            return ResponseEntity.ok(mutableJsonResponse.toString());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error processing Gemini response: " + e.getMessage());
        }
    }

    @PostMapping("/classify")
    public ResponseEntity<String> classifyImage(@RequestBody GeminiRequest request) {
        request.setPrompt(GeminiPrompts.CLASSIFY_PROMPT);
        return handleGeminiRequest(request);
    }

    @PostMapping("/packaged")
    public ResponseEntity<String> analyzePackaged(@RequestBody GeminiRequest request) {
        request.setPrompt(GeminiPrompts.PACKAGED_PROMPT);
        return handleGeminiRequest(request);
    }

    @PostMapping("/prepared")
    public ResponseEntity<String> analyzePrepared(@RequestBody GeminiRequest request) {
        request.setPrompt(GeminiPrompts.PREPARED_PROMPT);
        return handleGeminiRequest(request);
    }
}