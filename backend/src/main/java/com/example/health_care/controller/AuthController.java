package com.example.health_care.controller;

import java.net.URI;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.example.health_care.dto.ExistsResponse;
import com.example.health_care.dto.LoginRequest;
import com.example.health_care.dto.LoginResponse;
import com.example.health_care.dto.SignupRequest;
import com.example.health_care.dto.SignupResponse;
import com.example.health_care.entity.CustomersEntity;
import com.example.health_care.security.JwtTokenProvider;
import com.example.health_care.service.CustomersService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RequiredArgsConstructor
@RestController
@RequestMapping("/api/auth")
@Validated
public class AuthController {

    private final CustomersService customersService;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;

    @PostMapping("/signup")
    public ResponseEntity<SignupResponse> signup(@Valid @RequestBody SignupRequest request) {
        log.info("[SIGNUP] request id = {}, weight = {}, age = {}, gender = {}, height = {}",
                request.getId(), request.getWeight(), request.getAge(), request.getGender(), request.getHeight());
        CustomersEntity saved = customersService.signup(request);
        SignupResponse response = SignupResponse.fromEntity(saved);
        return ResponseEntity.created(URI.create("/api/users/" + saved.getId())).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getId(), request.getPassword()));
            String token = jwtTokenProvider.createToken(authentication);
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            return ResponseEntity.ok(LoginResponse.builder()
                    .token(token).tokenType("Bearer").id(userDetails.getUsername()).build());
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(LoginResponse.builder().token(null).tokenType("Bearer").id(null).build());
        }
    }

    // 이메일 존재 여부 체크 (+ 잘못된 이메일 형식이면 400)
    @GetMapping("/exists")
    public ResponseEntity<ExistsResponse> exists(
            @RequestParam("id")
            @Email(message = "올바른 이메일 형식이어야 합니다.")
            @Pattern(regexp = "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", message = "이메일에는 @와 .이 포함되어야 합니다.")
            String id) {
        boolean exists = customersService.exists(id);
        return ResponseEntity.ok(new ExistsResponse(exists));
    }
}
