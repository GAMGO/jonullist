package com.example.health_care.service;

import java.util.Locale;

import com.example.health_care.dto.SignupRequest;
import com.example.health_care.entity.CustomersEntity;
import com.example.health_care.repository.CustomersRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@RequiredArgsConstructor
@Service
public class CustomersService implements UserDetailsService {

    private final CustomersRepository customersRepository;
    private final PasswordEncoder passwordEncoder;

    // DietCare 아이디어 반영: 이메일 정규화(소문자/trim) 후 중복 체크 및 저장
    @Transactional
    public CustomersEntity signup(SignupRequest req) {
        final String email = normalizeEmail(req.getId());
        log.debug("[SIGNUP:SERVICE] existsById? id={}", email);

        if (customersRepository.existsById(email)) {
            log.warn("[SIGNUP:SERVICE] duplicate id={}", email);
            throw new IllegalArgumentException("이미 존재하는 ID입니다.");
        }

        CustomersEntity user = CustomersEntity.builder()
                .id(email)
                .password(passwordEncoder.encode(req.getPassword())) // 비밀번호 해시
                .weight(req.getWeight())
                .age(req.getAge())
                .gender(req.getGender())
                .height(req.getHeight())
                .build();

        return customersRepository.save(user);
    }

    public boolean exists(String id) {
        return customersRepository.existsById(normalizeEmail(id));
    }

    @Override
    public UserDetails loadUserByUsername(String id) throws UsernameNotFoundException {
        final String email = normalizeEmail(id);
        CustomersEntity user = customersRepository.findById(email)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다 : " + email));

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getId())
                .password(user.getPassword())
                .roles("USER")
                .build();
    }

    private String normalizeEmail(String raw) {
        return String.valueOf(raw == null ? "" : raw).trim().toLowerCase(Locale.ROOT);
    }
}
