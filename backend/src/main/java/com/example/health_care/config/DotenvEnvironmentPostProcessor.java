package com.example.health_care.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.PropertiesPropertySource;

import java.io.File;
import java.util.Properties;

/**
 * apikeys.env 파일을 애플리케이션 시작 시점에 로드하여
 * 환경 변수(Environment)에 추가하는 역할을 합니다.
 * 이 프로세서는 다른 빈이 생성되기 전에 실행됩니다.
 */
public class DotenvEnvironmentPostProcessor implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        // apikeys.env 파일 경로 설정
        String filePath = "./apikeys.env";
        File file = new File(filePath);

        if (file.exists() && file.isFile()) {
            try {
                // .env 파일을 로드합니다.
                Dotenv dotenv = Dotenv.configure()
                        .directory(new File(".").getCanonicalPath()) // 현재 작업 디렉터리
                        .filename("apikeys.env")
                        .load();

                Properties properties = new Properties();
                dotenv.entries().forEach(entry -> {
                    properties.put(entry.getKey(), entry.getValue());
                    System.out.println("Loaded .env property: " + entry.getKey());
                });

                // 로드된 속성을 환경에 추가합니다.
                environment.getPropertySources().addLast(new PropertiesPropertySource("dotenvFile", properties));
                System.out.println("Successfully loaded apikeys.env properties.");

            } catch (Exception e) {
                System.err.println("Failed to load apikeys.env file: " + e.getMessage());
                // 오류가 발생해도 애플리케이션이 시작되도록 합니다.
            }
        } else {
            System.out.println("apikeys.env file not found at " + filePath);
            System.out.println("Proceeding with existing environment variables.");
        }
    }
}
