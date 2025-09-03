package com.example.health_care.repository;

import java.time.LocalDateTime;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import com.example.health_care.entity.BlacklistedTokenEntity;

public interface BlacklistedTokenRepository extends JpaRepository<BlacklistedTokenEntity, Long> {
    boolean existsByToken(String token);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from BlacklistedTokenEntity b where b.expiresAt < :now")
    int deleteAllExpired(LocalDateTime now);
}
