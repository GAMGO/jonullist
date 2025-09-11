package com.example.health_care.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class YoutubeDTO {
    
    private String videoId; // 영상 ID
    private String thumbnail; // 썸네일 URL
    private String title; // 영상 제목
    private String channelTitle; // 채널명
    private String viewCount; // 조회수
    private String publishedAt; // 업로드일
    
}
