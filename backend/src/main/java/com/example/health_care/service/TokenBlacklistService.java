package com.example.health_care.service;

import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.health_care.entity.BlacklistedTokenEntity;
import com.example.health_care.repository.BlacklistedTokenRepository;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Service
public class TokenBlacklistService {

    private final BlacklistedTokenRepository repository;

    @Transactional(readOnly = true)
    public boolean isBlacklisted(String token) {
        return repository.existsByToken(token);
    }

    @Transactional
    public void blacklist(String token, String userId, LocalDateTime expiresAt, String reason) {
        if (repository.existsByToken(token)) return;
        BlacklistedTokenEntity e = BlacklistedTokenEntity.builder()
                .token(token)
                .userId(userId)
                .expiresAt(expiresAt)
                .createdAt(LocalDateTime.now())
                .reason(reason)
                .build();
        repository.save(e);
    }

    @Transactional
    public int purgeExpired() {
        return repository.deleteAllExpired(LocalDateTime.now());
    }
}
