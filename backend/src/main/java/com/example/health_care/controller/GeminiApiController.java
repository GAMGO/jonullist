package com.example.health_care.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.example.health_care.service.GeminiApiService;
import com.example.health_care.entity.GeminiPrompts;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

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
        public String action;
    }

    // ✅ OCR 요청을 위한 별도의 클래스 추가
    public static class OcrRequest {
        public String base64Image;
    }

    // ✅ OCR 결과를 담아 보낼 응답 클래스 추가
    public static class OcrResponse {
        public String ocrText;

        public OcrResponse(String ocrText) {
            this.ocrText = ocrText;
        }
    }

    // analyzeFood 메서드의 반환 타입을 Mono<String>으로 변경
    @PostMapping("/analyze-food")
    public Mono<String> analyzeFood(@RequestBody AnalyzeRequest request) {
        String prompt;
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
                throw new IllegalArgumentException("Invalid action: " + request.action);
        }
        return geminiApiService.analyzeFoodImage(request.base64Image, prompt);
    }

    // ✅ OCR을 위한 새로운 엔드포인트 추가
    @PostMapping("/ocr")
    public OcrResponse performOcr(@RequestBody OcrRequest request) {
        String ocrText = geminiApiService.performOcr(request.base64Image);
        return new OcrResponse(ocrText);
    }

    // ✅ MCP 구조를 위한 새로운 엔드포인트
    @PostMapping("/analyze-food-mcp")
    public Mono<String> analyzeFoodMcp(@RequestBody AnalyzeRequest request) {
        String base64Image = request.base64Image;

        // 1. AI 분석 채널: 비동기적으로 음식명, 양 등을 분석
        // Gemini API 호출은 이미 Mono를 반환하므로 비동기적입니다.
        Mono<String> aiAnalysisMono = geminiApiService.analyzeFoodImage(base64Image, GeminiPrompts.PREPARED_PROMPT);

        // 2. OCR 채널: CPU 집약적인 OCR 작업을 별도의 스레드에서 비동기적으로 실행
        // Blocking I/O 작업을 Mono로 감싸 병렬 처리 가능하게 함
        Mono<String> ocrTextMono = Mono.fromCallable(() -> geminiApiService.performOcr(base64Image))
                .subscribeOn(Schedulers.boundedElastic());

        // 3. 두 채널의 결과가 모두 반환될 때까지 대기 후, 두 결과를 결합하는 로직 실행
        return Mono.zip(aiAnalysisMono, ocrTextMono)
                .flatMap(tuple -> {
                    String aiResultJson = tuple.getT1();
                    String ocrText = tuple.getT2();

                    // combineAndCalculate 메서드에서 두 결과를 통합 처리
                    return geminiApiService.combineAndCalculate(aiResultJson, ocrText);
                })
                .onErrorResume(e -> {
                    // MCP 처리 중 오류 발생 시, 에러 메시지 반환
                    System.err.println("MCP process failed: " + e.getMessage());
                    return Mono.just("{\"error\":\"MCP process failed\"}");
                });
    }
}