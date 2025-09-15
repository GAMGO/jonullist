package com.example.health_care.controller;

import com.example.health_care.entity.Quest;
import com.example.health_care.service.QuestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/quests")
@RequiredArgsConstructor
public class QuestController {

    private final QuestService questService;

    /**
     * 고객 ID에 따라 일일 퀘스트 목록을 반환합니다.
     *
     * @param customerId 고객 ID
     * @return 일일 퀘스트 목록
     */
    @GetMapping("/daily")
    public ResponseEntity<List<Quest>> getDailyQuests(@RequestParam String customerId) {
        // QuestService를 통해 퀘스트 목록을 동적으로 생성하고 가져옵니다.
        List<Quest> dailyQuests = questService.generateDailyQuests(customerId);
        return ResponseEntity.ok(dailyQuests);
    }
}