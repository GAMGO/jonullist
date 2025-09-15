package com.example.health_care.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

import com.example.health_care.entity.Gender;
import com.fasterxml.jackson.annotation.JsonFormat;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "customers")
public class CustomersEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "customers_seq")
    @SequenceGenerator(name = "customers_seq", sequenceName = "CUSTOMERS_SEQ", allocationSize = 1)
    @Column(name = "idx")
    private Long idx;

    @Column(name = "id", length = 100, nullable = false, updatable = false, unique = true)
    private String id;

    @Column(name = "password", length = 255, nullable = false) // length 60 -> 50 수정
    private String password;

    @Column(name = "weight")
    private Double weight;

    @Column(name = "age")
    private Integer age;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", length = 1)
    private Gender gender;

    @Column(name = "height")
    private Double height;

    @Column(name = "email_verified")
    private Boolean emailVerified; // 이메일 인증 

    @Column(name = "email_verification_token")
    private String emailVerificationToken; // 이메일 인증 토큰

    @Column(name = "email_verification_expires")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime emailVerificationExpires;
}
/*tlqkf */
/*..? */