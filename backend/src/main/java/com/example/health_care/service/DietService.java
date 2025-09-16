package com.example.health_care.service;

import com.example.health_care.dto.DietRequest;
import com.example.health_care.entity.CustomersEntity;
import com.example.health_care.entity.RecordEntity;
import com.example.health_care.repository.CustomersRepository;
import com.example.health_care.repository.RecordRepository;
import com.fasterxml.jackson.core.JsonProcessingException;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.security.core.userdetails.UsernameNotFoundException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor // 필드 주입
public class DietService {

    private final CustomersRepository customersRepository;
    private final RecordRepository recordRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // 식단 기록 화면에 쓰일 메소드
    @Transactional
    public void saveDietRecord(String customerId, DietRequest request) {
        // 이메일로 customers.idx 조회
        CustomersEntity customers = customersRepository.findById(customerId)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));

        // 날짜 파싱
        Date recordDate = parseDate(request.getDate());

        // 해당 날짜의 RECORD 조회 (없으면 생성)
        RecordEntity record = getOrCreateRecord(customers.getIdx(), recordDate);

        // 식사 타입에 따라 칼로리 추가
        addCaloriesToRecord(record, request.getType(), request.getCalories());

        // 상세 정보를 JSON으로 저장 (timestamp 포함)
        addMealDetailToRecord(record, request.getType(), request.getFood(), request.getCalories(), request.getTimestamp());

        // 변경사항 db저장
        recordRepository.save(record);
        log.info("식단 기록 저장 완료 : customerId={}, date={}, type={}, food={}, calories={}",
                customers.getIdx(), request.getDate(), request.getType(), request.getFood(), request.getCalories());
    }

    /**** 메소드 ****/
    // 날짜 파싱 메소드
    private Date parseDate(String dateStr) {
        try {
            // 프론트엔드 형식으로 파싱
            SimpleDateFormat frontendFormat = new SimpleDateFormat("yyyy-MM-dd");
            Date date = frontendFormat.parse(dateStr);
            log.info("1단계 파싱: {} -> {}", dateStr, date);

            // Oracle 형식으로 변환
            SimpleDateFormat oracleFormat = new SimpleDateFormat("dd/MM/yy");
            String oracleDateStr = oracleFormat.format(date);
            log.info("2단계 파싱: {} -> {}", date, oracleDateStr);

            // Oracle 형식으로 다시 파싱
            Date resullt = oracleFormat.parse(oracleDateStr);
            log.info("3단계 파싱: {} -> {}", oracleDateStr, resullt);
            return resullt;

        } catch (ParseException e) {
            throw new IllegalArgumentException("잘못된 날짜 형식입니다.");
        }
    }

    // 같은 날짜에 여러 번 식단 기록, 기존 RECORD가 있으면 사용/없으면 새로 생성
    private RecordEntity getOrCreateRecord(Long customerIdx, Date recordDate) {
        log.info("RECORD 조회 시작: customerIdx={}, recordDate={}", customerIdx, recordDate);

        List<RecordEntity> existingRecords = recordRepository.findByCustomer_IdxAndRecordDate(customerIdx, recordDate);
        log.info("조회된 RECORD 개수: {}", existingRecords.size());

        if (!existingRecords.isEmpty()) {
            log.info("기존 RECORD 발견: {}개", existingRecords.size());
            return existingRecords.get(0);
        }

        log.info("새 RECORD 생성");

        // 없으면 새로 생성
        log.info("새 RECORD 생성");
        RecordEntity newRecord = RecordEntity.builder()
                .customer(CustomersEntity.builder().idx(customerIdx).build())
                .recordDate(recordDate)
                .caloriesM(0L)
                .caloriesL(0L)
                .caloriesD(0L)
                .mealDetails("{}") // 빈 JSON 객체
                .build();
        return recordRepository.save(newRecord);
    }

    // 상세 정보를 JSON으로 저장
    private void addCaloriesToRecord(RecordEntity record, String mealType, Long calories) {
        switch (mealType.toLowerCase()) {
            case "morning":
                record.setCaloriesM((record.getCaloriesM() != null ? record.getCaloriesM() : 0L) + calories);
                break;
            case "lunch":
                record.setCaloriesL((record.getCaloriesL() != null ? record.getCaloriesL() : 0L) + calories);
                break;
            case "dinner":
                record.setCaloriesD((record.getCaloriesD() != null ? record.getCaloriesD() : 0L) + calories);
                break;

            default:
                throw new IllegalArgumentException("잘몬된 식사 타입니다: " + mealType);
        }
    }

    // 기존 meal_details JSON 파싱 -> 새 음식 추가 -> JSON으로 저장
    private void addMealDetailToRecord(RecordEntity record, String mealType, String foodName, Long calories, Long timestamp) {
        try {
            // 기존 meal_details JSON 파싱
            Map<String, Object> mealDetails = new HashMap<>();
            if (record.getMealDetails() != null && !record.getMealDetails().isEmpty()) {
                @SuppressWarnings("unchecked")
                Map<String, Object> parsedDetails = objectMapper.readValue(record.getMealDetails(), Map.class);
                mealDetails = parsedDetails;
            }

            // 해당 식사 타입의 리스트 가져오기 (없으면 생성)
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> mealList = (List<Map<String, Object>>) mealDetails.getOrDefault(mealType,
                    new java.util.ArrayList<>());

            // 새로운 음식 정보 추가
            Map<String, Object> foodItem = new HashMap<>();
            foodItem.put("food", foodName);
            foodItem.put("calories", calories);
            foodItem.put("timestamp", timestamp != null ? timestamp : new Date().getTime());

            mealList.add(foodItem);
            mealDetails.put(mealType, mealList);

            // JSON으로 변환해서 저장
            record.setMealDetails(objectMapper.writeValueAsString(mealDetails));

        } catch (JsonProcessingException e) {
            log.error("JSON 처리 중 오류 발생", e);
            throw new RuntimeException("식단 상세 정보 저장 중 오류가 발생했습니다.");
        }
    }

    // 식단조회 메소드
    @Transactional(readOnly = true)
    public RecordEntity getDietRecord(String customerId, String date) {

        CustomersEntity customer = customersRepository.findById(customerId)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다."));

        Date recordDate = parseDate(date);

        // RECORD 조회만(저장하지 않음)
        RecordEntity record = getOrCreateRecord(customer.getIdx(), recordDate);

        return record;
    }

}
