package com.example.health_care.controller;

import com.example.health_care.entity.GeminiPrompts;
import com.example.health_care.dto.GeminiRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Collections;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api")
public class GeminiController {

    private final WebClient webClient;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    public GeminiController(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.baseUrl("https://generativelanguage.googleapis.com").build();
    }

    @PostMapping("/gemini-proxy")
    public Mono<ResponseEntity<String>> handleGeminiRequest(@RequestBody GeminiRequest request) {
        if (geminiApiKey == null || geminiApiKey.isEmpty()) {
            return Mono.just(ResponseEntity.status(500).body("API Key is not configured."));
        }

        Map<String, Object> body = new HashMap<>();
        Map<String, Object> parts = new HashMap<>();
        parts.put("text", request.getPrompt());

        Map<String, String> inlineData = new HashMap<>();
        inlineData.put("mimeType", request.getMimeType());
        inlineData.put("data", request.getImageData());

        parts.put("inlineData", inlineData);

        Map<String, Object> content = new HashMap<>();
        content.put("parts", Collections.singletonList(parts));

        Map<String, Double> generationConfig = new HashMap<>();
        generationConfig.put("temperature", 0.1);

        body.put("contents", Collections.singletonList(content));
        body.put("generationConfig", generationConfig);

        return webClient.post()
                .uri("/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + geminiApiKey)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .body(BodyInserters.fromValue(body))
                .retrieve()
                .bodyToMono(String.class)
                .map(responseBody -> {
                    try {
                        ObjectMapper mapper = new ObjectMapper();
                        JsonNode root = mapper.readTree(responseBody);
                        JsonNode textNode = root.at("/candidates/0/content/parts/0/text");
                        if (textNode.isTextual()) {
                            return ResponseEntity.ok(textNode.asText());
                        }
                    } catch (Exception e) {
                        // JSON 파싱 실패 시 원본 응답을 반환하거나 에러 처리
                    }
                    return ResponseEntity.ok(responseBody);
                });
    }

    @PostMapping("/gemini-proxy/classify")
    public Mono<ResponseEntity<String>> classifyImage(@RequestBody GeminiRequest request) {
        request.setPrompt(GeminiPrompts.CLASSIFY_PROMPT);
        return handleGeminiRequest(request);
    }

    @PostMapping("/gemini-proxy/packaged")
    public Mono<ResponseEntity<String>> analyzePackaged(@RequestBody GeminiRequest request) {
        request.setPrompt(GeminiPrompts.PACKAGED_PROMPT);
        return handleGeminiRequest(request);
    }

    @PostMapping("/gemini-proxy/prepared")
    public Mono<ResponseEntity<String>> analyzePrepared(@RequestBody GeminiRequest request) {
        request.setPrompt(GeminiPrompts.PREPARED_PROMPT);
        return handleGeminiRequest(request);
    }
}