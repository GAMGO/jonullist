package com.example.health_care.service;

import com.example.health_care.entity.Quest;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
public class QuestService {

    private final Random random = new Random();

    /**
     * 고객 ID에 따라 일일 퀘스트를 생성하는 메서드입니다.
     * 다양한 타입의 퀘스트를 동적으로 생성합니다.
     *
     * @param customerId 고객 ID (현재 로직에서는 사용되지 않지만 추후 개인화에 활용 가능)
     * @return 일일 퀘스트 목록
     */
    public List<Quest> generateDailyQuests(String customerId) {
        List<Quest> dailyQuests = new ArrayList<>();

        // 퀘스트 종류별로 동적 생성 메서드 호출
        dailyQuests.add(generateRepsQuest());
        dailyQuests.add(generateDistanceQuest());
        dailyQuests.add(generateTimeQuest());

        // TODO: 이미 완료된 퀘스트는 제외하는 로직 추가
        // - 이 부분은 데이터베이스와 연동하여 고객별 완료 상태를 확인하는 로직이 필요합니다.

        return dailyQuests;
    }

    /**
     * 횟수(reps) 기반 퀘스트를 무작위로 생성합니다.
     */
    private Quest generateRepsQuest() {
        String[] repsTypes = {"스쿼트", "팔굽혀펴기", "버피", "윗몸일으키기", "런지"};
        String questName = repsTypes[random.nextInt(repsTypes.length)];
        
        // 목표 횟수 설정 (5회 단위, 5~100회)
        int targetReps = (random.nextInt(20) + 1) * 5;
        
        // 목표 횟수에 비례하여 보상 계산
        int reward = targetReps;
        
        String id = questName.toLowerCase().replaceAll(" ", "_") + "_" + targetReps;
        String desc = String.format("%s %d회! 땀 흘리는 당신이 가장 멋집니다.", questName, targetReps);
        
        return new Quest(id, String.format("%s %d회", questName, targetReps), desc, reward, targetReps, "reps");
    }

    /**
     * 거리(distance) 기반 퀘스트를 무작위로 생성합니다.
     */
    private Quest generateDistanceQuest() {
        String[] distanceTypes = {"달리기", "걷기", "계단 오르기"};
        String questName = distanceTypes[random.nextInt(distanceTypes.length)];
        
        // 목표 거리 설정 (1000m ~ 10000m)
        int targetDistance = (random.nextInt(10) + 1) * 1000;
        
        // 목표 거리에 비례하여 보상 계산 (예: 1km당 50 보상)
        int reward = (targetDistance / 1000) * 50;

        // 계단 오르기일 경우, 목표 값과 보상 단위를 층(floor)으로 변경
        if ("계단 오르기".equals(questName)) {
            int targetFloors = (random.nextInt(10) + 1) * 5; // 5층 ~ 50층
            reward = targetFloors * 10; // 1층당 10 보상
            String id = "stair_climb_" + targetFloors + "f";
            String desc = String.format("%d층 계단 오르기! 엘리베이터 대신 건강을 선택하세요.", targetFloors);
            return new Quest(id, String.format("계단 오르기 %d층", targetFloors), desc, reward, targetFloors, "reps"); // reps 타입으로 처리
        }
        
        String id = questName.toLowerCase().replaceAll(" ", "_") + "_" + (targetDistance / 1000) + "k";
        String desc = String.format("%s %dkm! 상쾌한 공기를 마시며 달려보세요.", questName, (targetDistance / 1000));

        return new Quest(id, String.format("%s %dkm", questName, (targetDistance / 1000)), desc, reward, targetDistance, "distance");
    }

    /**
     * 시간(time) 기반 퀘스트를 무작위로 생성합니다.
     */
    private Quest generateTimeQuest() {
        String[] timeTypes = {"플랭크", "스트레칭", "줄넘기", "홈 트레이닝"};
        String questName = timeTypes[random.nextInt(timeTypes.length)];

        // 목표 시간 설정 (1분 ~ 30분)
        int targetTimeMinutes = (random.nextInt(30) + 1);
        
        // 목표 시간에 비례하여 보상 계산 (1분당 20 보상)
        int reward = targetTimeMinutes * 20;

        // 플랭크는 초 단위로, 보상을 좀 더 높게 책정
        if ("플랭크".equals(questName)) {
            int targetTimeSeconds = (random.nextInt(6) + 1) * 30; // 30초 ~ 180초
            reward = targetTimeSeconds / 5; // 5초당 1 보상
            String id = "plank_" + targetTimeSeconds + "s";
            String desc = String.format("코어 근육을 단련하는 플랭크 %d초에 도전하세요!", targetTimeSeconds);
            return new Quest(id, String.format("플랭크 %d초", targetTimeSeconds), desc, reward, targetTimeSeconds, "time");
        }
        
        String id = questName.toLowerCase().replaceAll(" ", "_") + "_" + targetTimeMinutes + "m";
        String desc = String.format("%s %d분! 꾸준함이 습관을 만듭니다.", questName, targetTimeMinutes);
        
        return new Quest(id, String.format("%s %d분", questName, targetTimeMinutes), desc, reward, targetTimeMinutes, "time");
    }
}