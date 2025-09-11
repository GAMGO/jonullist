package com.example.health_care.service;

import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.client.RestTemplate;

import com.example.health_care.config.GeminiClient;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import java.util.Map;
import java.util.HashMap;
import java.util.List;

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
     * @return Gemini API의 응답 결과
     */
    public String callGeminiApi(String imageData, String mimeType, String prompt) {
        String apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + geminiClient.getKey();

        Map<String, Object> inlineData = new HashMap<>();
        inlineData.put("mimeType", mimeType);
        inlineData.put("data", imageData);

        Map<String, Object> part1 = new HashMap<>();
        part1.put("text", prompt);

        Map<String, Object> part2 = new HashMap<>();
        part2.put("inlineData", inlineData);

        Map<String, Object> content = new HashMap<>();
        content.put("parts", new Object[]{part1, part2});

        Map<String, Object> body = new HashMap<>();
        body.put("contents", new Object[]{content});
        body.put("generationConfig", new HashMap<String, Object>() {{
            put("temperature", 0.1);
        }});

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(apiUrl, entity, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseBody.get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map<String, Object> firstCandidate = candidates.get(0);
                    Map<String, Object> contentMap = (Map<String, Object>) firstCandidate.get("content");
                    List<Map<String, Object>> parts = (List<Map<String, Object>>) contentMap.get("parts");
                    if (parts != null && !parts.isEmpty()) {
                        return (String) parts.get(0).get("text");
                    }
                }
            }
            return "Failed to get a successful response from Gemini API.";
        } catch (Exception e) {
            e.printStackTrace();
            return "Error calling Gemini API: " + e.getMessage();
        }
    }
}
