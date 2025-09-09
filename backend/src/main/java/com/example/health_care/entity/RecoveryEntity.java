package com.example.health_care.entity;

import java.time.LocalDateTime;
import com.example.health_care.entity.RecoveryQuestionCode;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Column;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import lombok.Getter;
import lombok.Setter;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;


/**
 * 비밀번호 복구 엔티티
 * recovery 테이블과 매핑됩니다.
 *
 * customer_id 필드는 customers 테이블의 idx(NUMBER)와 연결됩니다.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "recovery", uniqueConstraints = {
        @UniqueConstraint(name = "uq_recovery_user_code", columnNames = {"customer_id", "code"})
})
public class RecoveryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idx")
    private Long idx;

    // String에서 Long으로 데이터 타입 변경 (DB의 NUMBER 타입과 매칭)
    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "code", length = 32, nullable = false)
    private RecoveryQuestionCode code;

    @Column(name = "answer_hash", length = 255, nullable = false)
    private String answerHash;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
