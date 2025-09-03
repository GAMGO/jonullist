package com.example.health_care.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.security.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// swagger ui 에 Authorizaton 버튼 추가하고 헤더 입력 표시할때 참고
@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info().title("API 문서").version("v1"))
                .components(new Components()
                        .addSecuritySchemes("bearer-key",
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("bearer-key"));
    }
}
// swagger ui 오른쪽 상단에 authorize 버튼 생김
/*
 * 또는
 * 
 * @SecurityScheme(
 * name = "JWT",
 * type = SecuritySchemeType.HTTP,
 * scheme = "bearer",
 * bearerFormat = "JWT"
 * )
 * 
 * 
 */