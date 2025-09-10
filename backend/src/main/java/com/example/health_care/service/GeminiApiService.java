package com.example.health_care.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import com.fasterxml.jackson.databind.JsonNode;

@Service
public class GeminiApiService {

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    private final WebClient webClient;

    public GeminiApiService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.baseUrl("https://generativelanguage.googleapis.com").build();
    }

    public String analyzeFoodImage(String base64Image, String promptText) {
        String uri = String.format("/v1beta/models/gemini-1.5-flash-latest:generateContent?key=%s", geminiApiKey);

        // 요청 본문 생성
        JsonNode requestBody = new com.fasterxml.jackson.databind.node.ObjectNode(
            com.fasterxml.jackson.databind.node.JsonNodeFactory.instance
        ).set(
            "contents",
            new com.fasterxml.jackson.databind.node.ArrayNode(
                com.fasterxml.jackson.databind.node.JsonNodeFactory.instance
            ).add(
                new com.fasterxml.jackson.databind.node.ObjectNode(
                    com.fasterxml.jackson.databind.node.JsonNodeFactory.instance
                ).set(
                    "parts",
                    new com.fasterxml.jackson.databind.node.ArrayNode(
                        com.fasterxml.jackson.databind.node.JsonNodeFactory.instance
                    ).add(
                        new com.fasterxml.jackson.databind.node.TextNode(promptText)
                    ).add(
                        new com.fasterxml.jackson.databind.node.ObjectNode(
                            com.fasterxml.jackson.databind.node.JsonNodeFactory.instance
                        ).set(
                            "inlineData",
                            new com.fasterxml.jackson.databind.node.ObjectNode(
                                com.fasterxml.jackson.databind.node.JsonNodeFactory.instance
                            ).put("mimeType", "image/jpeg")
                             .put("data", base64Image)
                        )
                    )
                )
            )
        );

        // Gemini API 호출
        String responseBody = webClient.post()
            .uri(uri)
            .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .body(BodyInserters.fromValue(requestBody))
            .retrieve()
            .bodyToMono(String.class)
            .block(); // 비동기 호출을 동기로 처리. 프로덕션 환경에서는 Mono를 직접 반환하는 것이 더 좋습니다.

        // TODO: 응답을 파싱하여 필요한 정보 추출
        // 지금은 임시로 전체 응답 반환
        return responseBody;
    }
}