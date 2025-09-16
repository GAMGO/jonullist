package com.example.health_care.service;

import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;

import com.example.health_care.config.GeminiClient;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.Collections;
import java.util.ArrayList;

/**
 * Gemini API 호출 로직을 담당하는 서비스 클래스입니다.
 * GeminiClient 클래스를 주입받아 API 키를 사용합니다.
 */
@Component
public class GeminiService {

    private final GeminiClient geminiClient;
    private final RestTemplate restTemplate;

    @Autowired
    public GeminiService(GeminiClient geminiClient) {
        this.geminiClient = geminiClient;
        this.restTemplate = new RestTemplate();
    }

    /**
     * Gemini API를 호출하여 텍스트 및 이미지 데이터를 처리합니다.
     * @param imageData Base64로 인코딩된 이미지 데이터
     * @param mimeType 이미지의 MIME 타입 (예: "image/jpeg")
     * @param prompt Gemini 모델에 전달할 프롬프트
     * @return Gemini API의 응답 결과 (JSON 문자열)
     * @throws Exception API 호출 실패 또는 타임아웃 발생 시
     */
    public String callGeminiApi(String imageData, String mimeType, String prompt) {
        String apiUrl = geminiClient.getBaseUrl() + "/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiClient.getKey();

        List<Map<String, Object>> parts = new ArrayList<>();

        Map<String, Object> textPart = new HashMap<>();
        textPart.put("text", prompt);
        parts.add(textPart);

        if (imageData != null && !imageData.isEmpty()) {
            Map<String, String> inlineData = new HashMap<>();
            inlineData.put("mimeType", mimeType);
            inlineData.put("data", imageData);
            Map<String, Object> imagePart = new HashMap<>();
            imagePart.put("inlineData", inlineData);
            parts.add(imagePart);
        }

        Map<String, Object> contents = new HashMap<>();
        contents.put("parts", parts);

        Map<String, Object> body = new HashMap<>();
        body.put("contents", Collections.singletonList(contents));
        body.put("generationConfig", new HashMap<String, Object>() {
            {
                put("temperature", 0.1);
            }
        });

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
            throw new Exception("Failed to get a successful response from Gemini API.");
        } catch (HttpClientErrorException | HttpServerErrorException e) {
            System.err.println("Gemini API Error Status: " + e.getStatusCode());
            System.err.println("Gemini API Error Body: " + e.getResponseBodyAsString());
            throw new RuntimeException("Gemini API 응답 오류: " + e.getResponseBodyAsString(), e);
        } catch (ResourceAccessException e) {
            System.err.println("Network/Connection Error: " + e.getMessage());
            throw new RuntimeException("네트워크 연결 또는 타임아웃 오류", e);
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Error calling Gemini API: " + e.getMessage(), e);
        }
    }
}