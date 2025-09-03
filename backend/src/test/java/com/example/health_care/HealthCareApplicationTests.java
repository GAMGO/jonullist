package com.example.health_care;

import com.example.health_care.repository.CustomersRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@SpringBootTest
class HealthCareApplicationTests {
	
	@Autowired
	CustomersRepository customersRepository;

	@Test
	void contextLoads() {
		log.info("{}",customersRepository.findAll());
		
	}

}
