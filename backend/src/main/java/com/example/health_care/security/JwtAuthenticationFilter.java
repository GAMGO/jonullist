package com.example.health_care.security;

import java.io.IOException;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import com.example.health_care.service.TokenBlacklistService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final UserDetailsService userDetailsService;
    private final TokenBlacklistService tokenBlacklistService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt)) {

                // 1) 블랙리스트 토큰 즉시 차단
                if (tokenBlacklistService.isBlacklisted(jwt)) {
                    log.debug("[JWT] blacklisted token blocked");
                    return; // 블랙리스트 토큰이면 더 이상 처리하지 않음. "여기서 멈춰!"
                }           // 밑 else if 실행안하고 여기서 종료함
                // 2) 유효성 검증 + 아직 인증 안된 경우만 컨텍스트 설정
                else if (tokenProvider.validateToken(jwt)
                        && SecurityContextHolder.getContext().getAuthentication() == null) {

                    String username = tokenProvider.getUsernameFromToken(jwt);

                    if (StringUtils.hasText(username)) {
                        UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                        authentication.setDetails(
                                new WebAuthenticationDetailsSource().buildDetails(request));

                        SecurityContextHolder.getContext().setAuthentication(authentication);
                        log.debug("[JWT] authentication set for user: {}", username);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Could not set user authentication - {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken)) {
            // Bearer 접두사 제거 (여러 번 있을 수 있음)
            String token = bearerToken;
            while (token.startsWith("Bearer ")) {
                token = token.substring(7).trim();
            }
            return token;
        }
        return null;
    }
}
