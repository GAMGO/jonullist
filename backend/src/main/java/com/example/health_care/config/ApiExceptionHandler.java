package com.example.health_care.config;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import jakarta.validation.ConstraintViolationException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValid(MethodArgumentNotValidException ex) {
        Map<String,Object> body = new HashMap<>();
        body.put("error","Bad Request");
        body.put("status",400);
        body.put("timestamp", Instant.now());
        body.put("message","입력 형식 오류");
        body.put("fieldErrors", ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> Map.of("field", ((FieldError)fe).getField(), "message", fe.getDefaultMessage()))
                .collect(Collectors.toList()));
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler({IllegalArgumentException.class, DataIntegrityViolationException.class})
    public ResponseEntity<?> handleDup(Exception ex) {
        Map<String,Object> body = new HashMap<>();
        body.put("error","Conflict");
        body.put("status",409);
        body.put("timestamp", Instant.now());
        body.put("message", ex.getMessage() != null ? ex.getMessage() : "중복 또는 무결성 오류");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<?> handleConstraint(ConstraintViolationException ex) {
        Map<String,Object> body = new HashMap<>();
        body.put("error","Bad Request");
        body.put("status",400);
        body.put("timestamp", Instant.now());
        body.put("message", ex.getMessage());
        return ResponseEntity.badRequest().body(body);
    }
}
