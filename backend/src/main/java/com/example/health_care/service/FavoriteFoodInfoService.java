package com.example.health_care.service;

import org.springframework.stereotype.Service;

import com.example.health_care.repository.CustomersRepository;
import com.example.health_care.repository.FavoriteFoodInfoRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class FavoriteFoodInfoService {
    
    private final CustomersRepository customersRepository;
    private final FavoriteFoodInfoRepository favoriteFoodInfoRepository;

    

    

}
