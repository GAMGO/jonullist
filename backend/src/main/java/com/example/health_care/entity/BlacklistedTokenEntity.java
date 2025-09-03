package com.example.health_care.entity;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "blacklisted_tokens")
@SequenceGenerator(name = "blk_tok_seq_gen", sequenceName = "BLK_TOK_SEQ", allocationSize = 1)
public class BlacklistedTokenEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "blk_tok_seq_gen")
    @Column(name = "id")
    private Long id;

    @Column(name = "token", length = 1024, nullable = false, unique = true)
    private String token;

    @Column(name = "user_id", length = 100, nullable = false)
    private String userId;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "reason", length = 100)
    private String reason;
}
