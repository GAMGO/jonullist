package com.example.health_care.controller;

import com.example.health_care.dto.YoutubeDTO;
import com.example.health_care.service.YoutubeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class YoutubeController {

    private final YoutubeService youtubeService;

    /**
     * YouTube 영상 검색 API
     * @param q 검색어
     * @param lang 언어 코드 (ko, en 등)
     * @return 검색된 YouTube 영상 목록
     */
    @GetMapping("/youtube/search")
    public ResponseEntity<List<YoutubeDTO>> searchYoutube(@RequestParam("q") String q, @RequestParam("lang") String lang) {
        try {
            // 검색어가 비어있으면 에러 반환
            if (q == null || q.trim().isEmpty()) {
                // 🚨🚨 클라이언트가 보낸 q가 없을 경우, 400 Bad Request 반환 🚨🚨
                return ResponseEntity.badRequest().build();
            }

            // YouTube 서비스를 통해 검색 수행
            List<YoutubeDTO> videos = youtubeService.searchVideos(q, lang);

            return ResponseEntity.ok(videos);

        } catch (Exception e) {
            // 🚨🚨 에러 발생 시 500 에러 반환으로 수정 🚨🚨
            return ResponseEntity.internalServerError().build();
        }
    }
}