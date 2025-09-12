package com.example.health_care.service;

import com.example.health_care.dto.YoutubeDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class YoutubeService {
    
    @Value("${YOUTUBE_API_KEY}")
    private String apiKey;
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    /**
     * YouTube 검색 API를 호출하여 영상 목록을 가져옵니다
     * @param query 검색어
     * @return YouTube 영상 목록 (최대 10개)
     */
    public List<YoutubeDTO> searchVideos(String query) {
        try {
            // YouTube Search API 호출
            String url = String.format(
                "https://www.googleapis.com/youtube/v3/search?part=snippet&q=%s&maxResults=10&type=video&key=%s",
                query, apiKey
            );
            
            String response = restTemplate.getForObject(url, String.class);
            JsonNode rootNode = objectMapper.readTree(response);
            JsonNode items = rootNode.get("items");
            
            List<YoutubeDTO> videoList = new ArrayList<>();
            
            // 각 영상 정보를 DTO로 변환
            for (JsonNode item : items) {
                JsonNode snippet = item.get("snippet");
                JsonNode id = item.get("id");
                
                YoutubeDTO dto = YoutubeDTO.builder()
                    .videoId(id.get("videoId").asText())
                    .title(snippet.get("title").asText())
                    .channelTitle(snippet.get("channelTitle").asText())
                    .thumbnail(snippet.get("thumbnails").get("medium").get("url").asText())
                    .publishedAt(snippet.get("publishedAt").asText())
                    .viewCount("조회수 정보 없음") // Search API에서는 조회수 제공 안함
                    .build();
                
                videoList.add(dto);
            }
            
            return videoList;
            
        } catch (Exception e) {
            // API 호출 실패 시 빈 리스트 반환
            return new ArrayList<>();
        }
    }
}
