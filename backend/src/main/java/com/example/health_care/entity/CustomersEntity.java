package com.example.health_care.entity;

import jakarta.persistence.*;
import lombok.*;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "customers")
public class CustomersEntity {

    @Id
    @Column(name = "id", length = 100, nullable = false, updatable = false)
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

    public enum Gender { M, F }
}
