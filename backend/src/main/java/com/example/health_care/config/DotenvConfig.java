package com.example.health_care.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.context.annotation.Configuration;
import javax.annotation.PostConstruct;

/**
 * .env 파일을 로드하여 시스템 환경 변수로 설정하는 설정 클래스입니다.
 * 이를 통해 Spring의 @Value 어노테이션이 .env 파일의 값을 읽을 수 있게 합니다.
 */
@Configuration
public class DotenvConfig {

    @PostConstruct
    public void loadDotenv() {
        try {
            // 프로젝트 루트에 있는 apikeys.env 파일을 로드합니다.
            Dotenv dotenv = Dotenv.configure()
                    .filename("apikeys.env")
                    .load();

            // .env 파일의 모든 변수를 시스템 환경 변수로 설정합니다.
            // 이렇게 해야 @Value("${...}") 어노테이션이 값을 찾을 수 있습니다.
            dotenv.entries().forEach(entry -> {
                System.setProperty(entry.getKey(), entry.getValue());
                System.out.println("Loaded .env property: " + entry.getKey());
            });

        } catch (Exception e) {
            System.err.println("Failed to load apikeys.env file: " + e.getMessage());
            // .env 파일이 없거나 로드에 실패해도 애플리케이션을 종료하지 않고 계속 진행합니다.
            // 운영 환경에서는 환경 변수를 직접 설정하므로 파일이 없을 수 있습니다.
        }
    }
}
