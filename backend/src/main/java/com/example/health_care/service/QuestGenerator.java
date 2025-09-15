package com.example.health_care.service;

import com.example.health_care.entity.Quest;
import java.util.Random;

// 퀘스트 데이터를 생성하는 정적(static) 유틸리티 클래스
public class QuestGenerator {

    private static final Random random = new Random();

    // 횟수(reps) 기반 퀘스트 생성
    public static Quest generateRepsQuest() {
        String[] repsTypes = {"스쿼트", "팔굽혀펴기", "버피", "윗몸일으키기", "런지"};
        String questName = repsTypes[random.nextInt(repsTypes.length)];
        int targetReps = (random.nextInt(20) + 1) * 5; // 5~100회
        int reward = targetReps;
        String id = questName.toLowerCase().replaceAll(" ", "_") + "_" + targetReps;
        String desc = String.format("%s %d회! 땀 흘리는 당신이 가장 멋집니다.", questName, targetReps);
        return new Quest(id, String.format("%s %d회", questName, targetReps), desc, reward, targetReps, "reps");
    }

    // 거리(distance) 기반 퀘스트 생성
    public static Quest generateDistanceQuest() {
        String[] distanceTypes = {"달리기", "걷기"};
        String questName = distanceTypes[random.nextInt(distanceTypes.length)];
        int targetDistance = (random.nextInt(10) + 1) * 1000; // 1km ~ 10km
        int reward = (targetDistance / 1000) * 50;
        String id = questName.toLowerCase().replaceAll(" ", "_") + "_" + (targetDistance / 1000) + "k";
        String desc = String.format("%s %dkm! 상쾌한 공기를 마시며 달려보세요.", questName, (targetDistance / 1000));
        return new Quest(id, String.format("%s %dkm", questName, (targetDistance / 1000)), desc, reward, targetDistance, "distance");
    }

    // 시간(time) 기반 퀘스트 생성
    public static Quest generateTimeQuest() {
        String[] timeTypes = {"플랭크", "스트레칭", "줄넘기", "홈 트레이닝"};
        String questName = timeTypes[random.nextInt(timeTypes.length)];
        
        if ("플랭크".equals(questName)) {
            int targetTimeSeconds = (random.nextInt(6) + 1) * 30; // 30초 ~ 180초
            int reward = targetTimeSeconds / 5;
            String id = "plank_" + targetTimeSeconds + "s";
            String desc = String.format("코어 근육을 단련하는 플랭크 %d초에 도전하세요!", targetTimeSeconds);
            return new Quest(id, String.format("플랭크 %d초", targetTimeSeconds), desc, reward, targetTimeSeconds, "time");
        } else {
            int targetTimeMinutes = (random.nextInt(30) + 1); // 1분 ~ 30분
            int reward = targetTimeMinutes * 20;
            String id = questName.toLowerCase().replaceAll(" ", "_") + "_" + targetTimeMinutes + "m";
            String desc = String.format("%s %d분! 꾸준함이 습관을 만듭니다.", questName, targetTimeMinutes);
            return new Quest(id, String.format("%s %d분", questName, targetTimeMinutes), desc, reward, targetTimeMinutes, "time");
        }
    }
}