package com.example.health_care.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.util.FileCopyUtils;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import com.example.health_care.controller.GeminiApiController;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Duration;

@Service
public class GeminiApiService {

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    private final WebClient webClient;
    private final Tesseract tesseract;
    private final ObjectMapper objectMapper;
    private static File tessdataDir;

    // 생성자에서 Tesseract 초기화 로직을 수행하도록 수정
    public GeminiApiService(WebClient.Builder webClientBuilder, ObjectMapper objectMapper) {
        this.webClient = webClientBuilder.baseUrl("https://generativelanguage.googleapis.com").build();
        this.objectMapper = objectMapper;
        // Tesseract 초기화 로직을 생성자에 추가
        this.tesseract = initializeTesseract();
    }

    private Tesseract initializeTesseract() {
        try {
            // JAR 내부의 tessdata를 임시 디렉터리로 복사
            tessdataDir = new File(System.getProperty("java.io.tmpdir"), "tessdata");
            if (!tessdataDir.exists()) {
                tessdataDir.mkdir();
                System.out.println("Tesseract temp directory created: " + tessdataDir.getAbsolutePath());
                
                // 복사할 파일 리스트
                String[] filesToCopy = {"kor.traineddata", "eng.traineddata"};
                
                for (String fileName : filesToCopy) {
                    ClassPathResource resource = new ClassPathResource("tessdata/" + fileName);
                    try (InputStream is = resource.getInputStream();
                            FileOutputStream os = new FileOutputStream(new File(tessdataDir, fileName))) {
                        FileCopyUtils.copy(is, os);
                        System.out.println("Copied " + fileName + " to " + tessdataDir.getAbsolutePath());
                    } catch (IOException e) {
                        System.err.println("Error copying Tesseract data file: " + fileName + " " + e.getMessage());
                        throw new RuntimeException("Tesseract data file 복사 오류: " + fileName, e);
                    }
                }
            }
            Tesseract tesseractInstance = new Tesseract();
            tesseractInstance.setDatapath(tessdataDir.getParent()); // Tesseract는 tessdata 상위 경로를 요구함
            tesseractInstance.setLanguage("kor+eng");
            System.out.println("Tesseract Data Path set to: " + tessdataDir.getParent());

            return tesseractInstance;
        } catch (Exception e) {
            System.err.println("Tesseract initialization failed: " + e.getMessage());
            throw new RuntimeException("Tesseract 초기화 오류", e);
        }
    }


    /**
      * Gemini API를 호출하여 이미지와 프롬프트를 분석합니다.
      * WebClient의 비동기적 특성을 살려 Mono<String>을 반환합니다.
      *
      * @param base64Image Base64 인코딩된 이미지 데이터
      * @param promptText  Gemini API에 전달할 텍스트 프롬프트
      * @return Gemini API 응답 본문을 담은 Mono<String>
      */
    public Mono<String> analyzeFoodImage(String base64Image, String promptText) {
        String uri = String.format("/v1beta/models/gemini-1.5-flash-latest:generateContent?key=%s", geminiApiKey);

        // JSON DTO 클래스를 사용하여 요청 본문 객체를 생성
        GeminiRequest requestBody = new GeminiRequest(
                new Content(List.of(
                        new TextPart(promptText),
                        new ImagePart(new InlineData("image/jpeg", base64Image))
                ))
        );

        return webClient.post()
                .uri(uri)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .bodyValue(requestBody) // ObjectMapper가 자동으로 객체를 JSON으로 변환
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(30)) // API 호출 타임아웃 설정
                .onErrorResume(WebClientResponseException.class, ex -> {
                    // API 응답 오류 발생 시
                    System.err.println("Gemini API call failed: " + ex.getStatusCode() + " - " + ex.getResponseBodyAsString());
                    return Mono.error(new RuntimeException("API call failed: " + ex.getResponseBodyAsString()));
                })
                .onErrorResume(ex -> {
                    // 기타 오류(타임아웃 등) 발생 시
                    System.err.println("Error during Gemini API call: " + ex.getMessage());
                    return Mono.error(new RuntimeException("API call failed: " + ex.getMessage()));
                });
    }

    /**
      * Tesseract를 사용하여 이미지에서 텍스트를 추출(OCR)합니다.
      *
      * @param base64Image Base64 인코딩된 이미지 데이터
      * @return 추출된 텍스트
      */
    public String performOcr(String base64Image) {
        if (base64Image == null || base64Image.isEmpty()) {
            return "";
        }
        try {
            byte[] imageBytes = Base64.getDecoder().decode(base64Image);
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageBytes));

            if (image == null) {
                System.err.println("Image conversion failed. Check for valid image data.");
                return "";
            }
            return tesseract.doOCR(image);
        } catch (IOException | TesseractException e) {
            System.err.println("Error during OCR processing: " + e.getMessage());
            return "";
        }
    }
    
    // ✅ 두 채널의 결과를 통합하고 최종 계산을 수행하는 메서드
    public Mono<String> combineAndCalculate(String aiResultJson, String ocrText) {
        try {
            // AI 분석 결과를 JSON 객체로 파싱
            JsonNode rootNode = objectMapper.readTree(aiResultJson);
            
            // OCR 결과 텍스트를 JSON에 추가 (예시)
            ((com.fasterxml.jackson.databind.node.ObjectNode) rootNode).put("ocrText", ocrText);

            // 여기에 OCR 텍스트와 AI 분석 결과를 비교하여 칼로리를 재계산하는 로직을 추가
            // 예: ocrText에 "150g"과 같은 정보가 있다면, 이를 우선적으로 활용하여 칼로리 계산을 업데이트합니다.

            // 최종 통합된 JSON 문자열 반환
            return Mono.just(objectMapper.writeValueAsString(rootNode));
        } catch (JsonProcessingException e) {
            System.err.println("JSON processing error: " + e.getMessage());
            return Mono.error(new RuntimeException("Failed to combine results"));
        }
    }
    
    // --- JSON 요청을 위한 DTO 클래스 ---
    // 내부 정적 클래스로 정의하여 코드 응집도를 높임

    private static class GeminiRequest {
        @JsonProperty("contents")
        private List<Content> contents;
    
        public GeminiRequest(Content content) {
            this.contents = Collections.singletonList(content);
        }
    }
    
    private static class Content {
        @JsonProperty("parts")
        private List<Part> parts;
    
        public Content(List<Part> parts) {
            this.parts = parts;
        }
    }
    
    private static abstract class Part {}
    
    private static class TextPart extends Part {
        @JsonProperty("text")
        private String text;
    
        public TextPart(String text) {
            this.text = text;
        }
    }
    
    private static class ImagePart extends Part {
        @JsonProperty("inlineData")
        private InlineData inlineData;
    
        public ImagePart(InlineData inlineData) {
            this.inlineData = inlineData;
        }
    }
    
    private static class InlineData {
        @JsonProperty("mimeType")
        private String mimeType;
        @JsonProperty("data")
        private String data;
    
        public InlineData(String mimeType, String data) {
            this.mimeType = mimeType;
            this.data = data;
        }
    }
}