package com.example.health_care.controller;

import com.example.health_care.entity.GeminiPrompts;
import com.example.health_care.dto.GeminiRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Map;
import java.util.HashMap;
import java.util.List;

@RestController
@RequestMapping("/api/gemini")
public class GeminiController {

    private final WebClient webClient;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    public GeminiController(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.baseUrl("https://generativelanguage.googleapis.com").build();
    }

    private Mono<ResponseEntity<String>> handleGeminiRequest(GeminiRequest request) {
        // 'contents' 배열의 첫 번째 항목인 'parts' 리스트를 생성합니다.
        List<Map<String, Object>> parts = new ArrayList<>();
        
        // 텍스트 프롬프트 부분을 추가합니다.
        Map<String, Object> textPart = new HashMap<>();
        textPart.put("text", request.getPrompt());
        parts.add(textPart);

        // 이미지 데이터가 있을 경우, 이미지 부분을 추가합니다.
        if (request.getImageData() != null && !request.getImageData().isEmpty()) {
            Map<String, String> inlineData = new HashMap<>();
            inlineData.put("mimeType", request.getMimeType());
            inlineData.put("data", request.getImageData());

            Map<String, Object> imagePart = new HashMap<>();
            imagePart.put("inlineData", inlineData);
            parts.add(imagePart);
        }
        
        // 최종 'contents' 객체를 구성합니다.
        Map<String, Object> contents = new HashMap<>();
        contents.put("parts", parts);

        // 최종 요청 본문(body)을 구성합니다.
        Map<String, Object> body = new HashMap<>();
        body.put("contents", Collections.singletonList(contents));
        body.put("generationConfig", new HashMap<String, Object>() {{
            put("temperature", 0.1);
        }});
        
        return webClient.post()
                .uri(uriBuilder -> uriBuilder
                    .path("/v1beta/models/gemini-1.5-flash:generateContent")
                    .queryParam("key", geminiApiKey)
                    .build())
                .contentType(MediaType.APPLICATION_JSON)
                .body(BodyInserters.fromValue(body))
                .retrieve()
                .bodyToMono(String.class)
                .map(response -> {
                    try {
                        ObjectMapper mapper = new ObjectMapper();
                        JsonNode root = mapper.readTree(response);
                        String text = root.at("/candidates/0/content/parts/0/text").asText();
                        return ResponseEntity.ok(text);
                    } catch (Exception e) {
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body("Failed to parse Gemini response JSON.");
                    }
                })
                .onErrorResume(e -> {
                    if (e instanceof WebClientResponseException) {
                        WebClientResponseException wcE = (WebClientResponseException) e;
                        System.err.println("Gemini API Error Body: " + wcE.getResponseBodyAsString());
                    }
                    System.err.println("WebClient error calling Gemini API: " + e.getMessage());
                    return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body("Error calling Gemini API: " + e.getMessage()));
                });
    }

    @PostMapping("/classify")
    public Mono<ResponseEntity<String>> classifyImage(@RequestBody GeminiRequest request) {
        request.setPrompt(GeminiPrompts.CLASSIFY_PROMPT);
        return handleGeminiRequest(request);
    }

    @PostMapping("/packaged")
    public Mono<ResponseEntity<String>> analyzePackaged(@RequestBody GeminiRequest request) {
        request.setPrompt(GeminiPrompts.PACKAGED_PROMPT);
        return handleGeminiRequest(request);
    }

    @PostMapping("/prepared")
    public Mono<ResponseEntity<String>> analyzePrepared(@RequestBody GeminiRequest request) {
        request.setPrompt(GeminiPrompts.PREPARED_PROMPT);
        return handleGeminiRequest(request);
    }
}