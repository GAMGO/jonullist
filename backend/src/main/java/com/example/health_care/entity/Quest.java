package com.example.health_care.entity;

public class Quest {
    private final String id;
    private final String name;
    private final String desc;
    private final int reward;
    private final int target;
    private final String type;
    
    // 모든 필드를 초기화하는 생성자
    public Quest(String id, String name, String desc, int reward, int target, String type) {
        this.id = id;
        this.name = name;
        this.desc = desc;
        this.reward = reward;
        this.target = target;
        this.type = type;
    }

    // Getters만 남겨두어 객체 생성 후에는 값을 변경할 수 없게 합니다.
    public String getId() { return id; }
    public String getName() { return name; }
    public String getDesc() { return desc; }
    public int getReward() { return reward; }
    public int getTarget() { return target; }
    public String getType() { return type; }
}