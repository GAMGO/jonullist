package com.example.health_care.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.util.Date;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "record")
public class RecordEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "idx", nullable = false)
    private Long idx;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private CustomersEntity customer;

    @CreatedDate
    @Column(name = "record_date", nullable = false, updatable = false)
    private Date recordDate;

    @Column(name = "caloriesm")
    private Long caloriesM;

    @Column(name = "caloriesl")
    private Long caloriesL;

    @Column(name = "caloriesd")
    private Long caloriesD;

    // 기존 아침,점심,저녁 데이터가 들어가는 필드
    @Lob
    @Column(name = "meal_details")
    private String mealDetails;


    @Column(name = "target_weight")
    private Double targetWeight;

    @Column(name = "target_calories")
    private Integer targetCalories;

}
