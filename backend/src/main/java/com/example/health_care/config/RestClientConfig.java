package com.example.health_care.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

// HTTP 클라이언트 설정
@Configuration
public class RestClientConfig {
    
    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);  // 5초 연결 타임아웃
        factory.setReadTimeout(10000);    // 10초 읽기 타임아웃
        return new RestTemplate(factory);
    }
    
}
