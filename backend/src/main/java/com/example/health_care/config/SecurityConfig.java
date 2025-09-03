package com.example.health_care.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.CorsFilter;
import com.example.health_care.security.JwtAuthenticationEntryPoint;
import com.example.health_care.security.JwtAuthenticationFilter;

@RequiredArgsConstructor
@Configuration
public class SecurityConfig {

    private final CorsConfig corsConfig;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    private static final String[] SWAGGER_WHITELIST = {
        "/v3/api-docs/**","/swagger-ui/**","/swagger-ui.html"
    };
    private static final String[] PUBLIC_WHITELIST = {
        "/api/ping","/api/auth/**","/error"
    };

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(c -> c.configurationSource(corsConfig.corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(eh -> eh.authenticationEntryPoint(jwtAuthenticationEntryPoint))
            .addFilterBefore(new CorsFilter(corsConfig.corsConfigurationSource()), UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(SWAGGER_WHITELIST).permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(PUBLIC_WHITELIST).permitAll()
                .anyRequest().authenticated()
            )
            .httpBasic(b -> b.disable())
            .formLogin(f -> f.disable());
        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration cfg) throws Exception {
        return cfg.getAuthenticationManager();
    }
}
