package com.example.health_care.entity;

import java.sql.Date;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import com.fasterxml.jackson.annotation.JsonIgnore;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "meal_alarm_settings")
public class MealAlarmSettingsEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idx;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    @JsonIgnore
    private CustomersEntity customer;

    @Column(name = "morning_hour")
    private Integer morningHour; // 0-23

    @Column(name = "morning_minute")
    private Integer morningMinute; // 0-59

    @Column(name = "lunch_hour")
    private Integer lunchHour; 

    @Column(name = "lunch_minute")
    private Integer lunchMinute;

    @Column(name = "dinner_hour")
    private Integer dinnerHour; 

    @Column(name = "dinner_minute")
    private Integer dinnerMinute;

    @Column(name = "alarm_enabled")
    private Boolean alarmEnabled;

    @Column(name = "created_at")
    private Date createdAt;

    @Column(name = "updated_at")
    private Date updatedAt;
}
