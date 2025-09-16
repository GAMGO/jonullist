package com.example.health_care.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

// 공공데이터 식품영양성분정보 API 클라이언트
@Component
public class FoodClient {

    private final RestTemplate restTemplate;
    private final String baseUrl;
    private final String endpoint;
    private final String encKey;
    private final String decKey;
    private volatile String workingKey;
    private volatile boolean workingIsEncoded;

    public FoodClient(
            RestTemplate restTemplate,
            @Value("${nutri.base-url}") String baseUrl,
            @Value("${nutri.endpoint}") String endpoint,
            @Value("${PUBLIC_DATA_API_KEY}") String key) { // apikeys.env 파일에 있는 변수명으로 수정

        this.restTemplate = restTemplate;
        this.baseUrl = safe(baseUrl);
        this.endpoint = safe(endpoint);
        this.decKey = safe(key); // PUBLIC_DATA_API_KEY를 decKey로 사용
        this.encKey = ""; // encKey는 사용하지 않으므로 빈 값으로 설정
        
        if (this.decKey.isBlank()) {
            throw new IllegalStateException("공공데이터 서비스키가 없습니다.");
        }
    }

    private static String safe(String s) {
        return s == null ? "" : s.trim();
    }

    // 식품명으로 영양성분 정보 검색
    public String searchByName(String name, int page, int perPage) {
        String q = name == null ? "" : name.trim();
        int pageNo = Math.max(1, page);
        int rows   = Math.min(Math.max(1, perPage), 50);

        if (workingKey == null) detectWorkingKey(q);

        try {
            return callOnce(q, pageNo, rows, workingKey, workingIsEncoded);
        } catch (RuntimeException ex) {
            // 첫 시도 실패 시 반대 키로 재시도
            if (workingIsEncoded && !decKey.isBlank()) {
                String body = callOnce(q, pageNo, rows, decKey, false);
                workingKey = decKey;
                workingIsEncoded = false;
                return body;
            }
            if (!workingIsEncoded && !encKey.isBlank()) {
                String body = callOnce(q, pageNo, rows, encKey, true);
                workingKey = encKey;
                workingIsEncoded = true;
                return body;
            }
            throw ex;
        }
    }

    // 사용 가능한 서비스키 자동 감지
    private void detectWorkingKey(String sampleQuery) {
        String probe = (sampleQuery == null || sampleQuery.isBlank()) ? "김밥" : sampleQuery;

        if (!decKey.isBlank()) {
            try {
                callOnce(probe, 1, 1, decKey, false);
                workingKey = decKey;
                workingIsEncoded = false;
                return;
            } catch (RuntimeException ignore) {}
        }
        if (!encKey.isBlank()) {
            callOnce(probe, 1, 1, encKey, true);
            workingKey = encKey;
            workingIsEncoded = true;
            return;
        }
        throw new RuntimeException("공공데이터 API 키 확인 실패");
    }

    // 공공데이터 API 실제 호출
    private String callOnce(String q, int pageNo, int rows, String key, boolean keyIsEncoded) {
        try {
            String encodedFoodNm = q == null ? "" : URLEncoder.encode(q, StandardCharsets.UTF_8);
            String serviceKey = keyIsEncoded ? key : URLEncoder.encode(key, StandardCharsets.UTF_8);

            String fullUrl = joinUrl(baseUrl, endpoint);
            URI uri = UriComponentsBuilder.fromHttpUrl(fullUrl)
                    .queryParam("serviceKey", serviceKey)
                    .queryParam("type", "json")
                    .queryParam("pageNo", pageNo)
                    .queryParam("numOfRows", rows)
                    .queryParam("foodNm", encodedFoodNm)
                    .build(true)
                    .toUri();

            HttpHeaders headers = new HttpHeaders();
            headers.setAcceptCharset(List.of(StandardCharsets.UTF_8));
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            ResponseEntity<String> response = restTemplate.exchange(
                    uri, HttpMethod.GET, new HttpEntity<>(headers), String.class);

            String body = response.getBody();
            if (body != null && body.trim().startsWith("{")) return body;

            throw new RuntimeException("공공데이터 API 응답이 JSON이 아닙니다: " + abbreviate(body, 400));

        } catch (RestClientResponseException e) {
            String bodyHead = e.getResponseBodyAsString();
            if (bodyHead != null && bodyHead.length() > 500) bodyHead = bodyHead.substring(0, 500);

            String tip = "";
            int code = e.getRawStatusCode();
            if (code == 301 || code == 302) {
                tip = " (base-url을 https://api.data.go.kr 로 설정하세요)";
            } else if (bodyHead != null && bodyHead.contains("SERVICE KEY IS NOT REGISTERED")) {
                tip = " (활용신청/승인 상태를 확인하세요)";
            }
            throw new RuntimeException("공공데이터 API 오류: HTTP " + code + " / " + bodyHead + tip, e);

        } catch (Exception e) {
            // 리다이렉트 문제 해결
            String message = e.getMessage();
            if (message != null && message.contains("www.api.data.go.kr")) {
                try {
                    String retryUrl = (baseUrl + endpoint).replace("www.api.data.go.kr", "api.data.go.kr");
                    ResponseEntity<String> retryResp = restTemplate.exchange(
                            URI.create(retryUrl), HttpMethod.GET, new HttpEntity<>(new HttpHeaders()), String.class);
                    return retryResp.getBody();
                } catch (Exception retryEx) {
                    throw new RuntimeException("공공데이터 API 재시도 실패: " + retryEx.getMessage(), retryEx);
                }
            }
            throw new RuntimeException("공공데이터 API 연결 오류: " + message, e);
        }
    }

    private static String joinUrl(String base, String path) {
        if (base.endsWith("/") && path.startsWith("/")) return base.substring(0, base.length()-1) + path;
        if (!base.endsWith("/") && !path.startsWith("/")) return base + "/" + path;
        return base + path;
    }

    private static String abbreviate(String s, int max) {
        if (s == null) return "";
        String t = s.replaceAll("\\s+", " ").trim();
        return t.length() > max ? t.substring(0, max) + "..." : t;
    }

    // 개발용 디버그 메서드
    public record RawProbe(int status, String finalUrl, String contentType, String bodyHead) {}

    public RawProbe debugPing(String q) {
        try {
            String body = callOnce(q == null ? "" : q.trim(), 1, 1, ensureWorkingKey(), workingIsEncoded);
            return new RawProbe(200, baseUrl + endpoint, "application/json", abbreviate(body, 400));
        } catch (Exception e) {
            return new RawProbe(500, baseUrl + endpoint, "error", e.getMessage());
        }
    }

    private String ensureWorkingKey() {
        if (workingKey == null) detectWorkingKey("김밥");
        return workingKey;
    }
}
