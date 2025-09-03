// 서버 통신 확인 메소드 : 살아있으면 "pong" 반환 // 서비스 배포 전에 삭제해주기

package com.example.health_care.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PingController {

    @GetMapping("/api/ping")
    public String ping() {
        return "pong";
    }
}
