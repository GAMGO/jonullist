package com.example.health_care.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.example.health_care.security.JwtAuthenticationFilter;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Configuration
public class SecurityConfig {

        private final CorsConfig corsConfig;

        // swagger 문서 접근 허용 목록
        private static final String[] SWAGGER_WHITELIST = {
                        "/v3/api-docs/**",
                        "/swagger-ui/**",
                        "/swagger-ui.html"
        };

        // 공개 허용 (개발용)
        private static final String[] PUBLIC_WHITELIST = {
                        "/api/ping", // 헬스 체크
                        "/api/auth/**", // 로그인/회원가입 등
                        "/error", // 스프링 기본 에러 엔드포인트
                        "/api/recover/**" ,// >>> [ADDED] 비밀번호 복구(시작/검증/재설정) 공개 엔드포인트
                        "/api/food/**",
                        "/api/gemini/**" //Gemini 분석 엔드포인트
        };

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http,
                        JwtAuthenticationFilter jwtAuthenticationFilter) throws Exception {
                http
                                // corsConfig 빈에서 가져온 설정을 직접 사용
                                .cors(cors -> cors.configurationSource(corsConfig.corsConfigurationSource()))
                                .csrf(csrf -> csrf.disable())
                                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers(SWAGGER_WHITELIST).permitAll()
                                                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                                                .requestMatchers(PUBLIC_WHITELIST).permitAll()
                                                .requestMatchers(HttpMethod.GET, "/ranking").permitAll()
                                                .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/signup")
                                                .permitAll()
                                                .requestMatchers("/api/auth/logout", "/body", "/api/profile")
                                                .authenticated() // 로그아웃, 바디프로필, 프로필 추가
                                                .requestMatchers("/api/food/public/**").permitAll()
                                                .requestMatchers("/api/youtube/**").permitAll()
                                                .anyRequest().authenticated())
                                // 폼/베이직 로그인 비활성
                                .httpBasic(b -> b.disable())
                                .formLogin(f -> f.disable());

                return http.build();
        }

        @Bean
        public PasswordEncoder passwordEncoder() {
                return new BCryptPasswordEncoder();
        }

        @Bean
        public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration)
                        throws Exception {
                return authenticationConfiguration.getAuthenticationManager();
        }

}
