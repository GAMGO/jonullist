package com.example.health_care.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
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

    @Value("${tesseract.datapath}")
    private String tesseractDatapath; // ✅ yml에서 직접 주입

    private final WebClient webClient;
    private final Tesseract tesseract;
    private final ObjectMapper objectMapper;

    public GeminiApiService(WebClient.Builder webClientBuilder, ObjectMapper objectMapper) {
        this.webClient = webClientBuilder.baseUrl("https://generativelanguage.googleapis.com").build();
        this.objectMapper = objectMapper;
        this.tesseract = initializeTesseract();
    }

    private Tesseract initializeTesseract() {
        try {
            Tesseract tesseractInstance = new Tesseract();
            tesseractInstance.setDatapath(tesseractDatapath); // ✅ yml 기반
            tesseractInstance.setLanguage("kor+eng+jpn");

            System.out.println("✅ Tesseract Data Path set to: " + tesseractDatapath);
            return tesseractInstance;
        } catch (Exception e) {
            System.err.println("Tesseract initialization failed: " + e.getMessage());
            throw new RuntimeException("Tesseract 초기화 오류", e);
        }
    }
    /**
     * Gemini API를 호출하여 이미지와 프롬프트를 분석합니다.
     * WebClient의 비동기적 특성을 살려 Mono<String>을 반환합니다.
     */
    public Mono<String> analyzeFoodImage(String base64Image, String promptText) {
        String uri = String.format("/v1beta/models/gemini-1.5-flash-latest:generateContent?key=%s", geminiApiKey);

        GeminiRequest requestBody = new GeminiRequest(
            new Content(List.of(
                new TextPart(promptText),
                new ImagePart(new InlineData("image/jpeg", base64Image)))));

        return webClient.post()
                .uri(uri)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(30))
                .onErrorResume(WebClientResponseException.class, ex -> {
                    System.err.println("Gemini API call failed: " + ex.getStatusCode() + " - " + ex.getResponseBodyAsString());
                    return Mono.error(new RuntimeException("API call failed: " + ex.getResponseBodyAsString()));
                })
                .onErrorResume(ex -> {
                    System.err.println("Error during Gemini API call: " + ex.getMessage());
                    return Mono.error(new RuntimeException("API call failed: " + ex.getMessage()));
                });
    }

    /**
     * Tesseract를 사용하여 이미지에서 텍스트를 추출(OCR)합니다.
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

    public Mono<String> combineAndCalculate(String aiResultJson, String ocrText) {
        try {
            JsonNode rootNode = objectMapper.readTree(aiResultJson);
            ((com.fasterxml.jackson.databind.node.ObjectNode) rootNode).put("ocrText", ocrText);
            return Mono.just(objectMapper.writeValueAsString(rootNode));
        } catch (JsonProcessingException e) {
            System.err.println("JSON processing error: " + e.getMessage());
            return Mono.error(new RuntimeException("Failed to combine results"));
        }
    }

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

    private static abstract class Part {
    }

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