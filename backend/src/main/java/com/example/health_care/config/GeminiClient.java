package com.example.health_care.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;

@Component
@ConfigurationProperties(prefix = "gemini.api")
public class GeminiClient {

    private String key;
    private String baseUrl;

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    @Override
    public String toString() {
        return "GeminiConfig{" +
                "key='" + key + '\'' +
                ", baseUrl='" + baseUrl + '\'' +
                '}';
    }
}