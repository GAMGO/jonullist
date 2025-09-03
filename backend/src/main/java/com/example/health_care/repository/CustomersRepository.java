package com.example.health_care.repository;

import com.example.health_care.entity.CustomersEntity;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomersRepository extends JpaRepository<CustomersEntity, String> {
     Optional<CustomersEntity> findById(String id);
}
