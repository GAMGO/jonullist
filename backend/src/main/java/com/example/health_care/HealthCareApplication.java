package com.example.health_care;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class HealthCareApplication {

    public static void main(String[] args) {
        // 이제 이 곳에 환경 변수를 로드하는 코드가 필요 없습니다.
        // DotEnvConfig.java가 이 역할을 대신합니다.
        SpringApplication.run(HealthCareApplication.class, args);
    }
}
