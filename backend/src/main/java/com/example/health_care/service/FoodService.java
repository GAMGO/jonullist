package com.example.health_care.service;

import com.example.health_care.config.FoodClient;
import com.example.health_care.dto.FoodDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.stream.Collectors;

/// 식품 영양성분 정보 서비스
@Service
public class FoodService {

    private static final List<String> NAME_KEYS = List.of("foodNm", "foodName", "desc_kor", "DESC_KOR", "식품명");
    private static final List<String> KCAL_KEYS = List.of("enerc", "kcal", "NUTR_CONT1", "에너지(kcal)", "에너지(KCAL)",
            "에너지kcal");

    private final FoodClient client;
    private final ObjectMapper om = new ObjectMapper();

    public FoodService(FoodClient client) {
        this.client = client;
    }

    // 식품명으로 영양성분 정보 검색
    public List<FoodDTO> searchSimple(String name, int page, int perPage) {
        String q = name == null ? "" : name.trim();
        if (q.isEmpty()) {
            return List.of();
        }

        int pageSafe = Math.max(1, page);
        int perPageSafe = Math.min(Math.max(1, perPage), 50);

        // 다양한 검색 키워드 조합을 생성합니다.
        List<String> searchQueries = createSearchQueries(q);
        // 모든 검색 결과를 저장할 임시 목록
        Map<String, FoodDTO> allCandidates = new LinkedHashMap<>();

        // 키워드 목록을 순회하며 모든 검색을 시도합니다.
        for (String query : searchQueries) {
            if (query.isEmpty()) {
                continue;
            }
            try {
                String body = client.searchByName(query, pageSafe, perPageSafe);
                
                System.out.println("➡️ 공공데이터 API 응답 (키워드: " + query + "): " + body);
                
                JsonNode root = om.readTree(body);

                // API 응답 에러 체크
                JsonNode header = root.path("response").path("header");
                String resultCode = header.path("resultCode").asText("");
                
                if ("00".equals(resultCode)) {
                    // 성공적으로 데이터를 받으면 파싱하여 모든 후보 목록에 추가
                    parseFoodData(root).forEach(dto -> allCandidates.putIfAbsent(dto.getFoodNm(), dto));
                } else if (!"03".equals(resultCode)) {
                    // 데이터 없음(03) 외 다른 오류는 예외를 발생시킵니다.
                    String msg = header.path("resultMsg").asText("");
                    throw new IllegalStateException("공공데이터 오류: " + resultCode + " / " + msg);
                }

            } catch (Exception e) {
                String msg = e.getMessage() == null ? e.toString() : e.getMessage();
                System.err.println("❌ 키워드 '" + query + "' 파싱 실패: " + msg);
            }
        }
        
        if (allCandidates.isEmpty()) {
            System.out.println("⚠️ 모든 키워드 검색 실패. 빈 목록을 반환합니다.");
            return List.of();
        }

        // 수집된 모든 후보 목록에 대해 순위를 매기고 필터링합니다.
        return rankAndFilterResults(new ArrayList<>(allCandidates.values()), q, perPageSafe);
    }
    
    // 다양한 검색 키워드 조합을 생성하는 헬퍼 메서드
    private List<String> createSearchQueries(String originalQuery) {
        List<String> queries = new ArrayList<>();
        // 1. 원본 키워드 (띄어쓰기 포함)
        queries.add(originalQuery);
        // 2. 공백 제거 키워드
        queries.add(originalQuery.replace(" ", ""));
        // 3. 핵심 단어 조합 (두 단어인 경우)
        String[] words = originalQuery.split("\\s+");
        if (words.length > 1) {
            String combined = words[1] + " " + words[0];
            queries.add(combined); // 예: '크런키 빼빼로'
            queries.add(combined.replace(" ", "")); // 예: '크런키빼빼로'
        }
        // 중복 제거 및 빈 문자열 제거
        return new ArrayList<>(new LinkedHashSet<>(queries));
    }

    // JSON 데이터를 FoodDTO로 파싱하는 헬퍼 메서드
    private List<FoodDTO> parseFoodData(JsonNode root) {
        Map<String, FoodDTO> dedup = new LinkedHashMap<>();

        JsonNode records = root.path("records");
        if (records.isArray() && records.size() > 0) {
            for (JsonNode n : records)
                addIfPresent(dedup, n);
        } else {
            JsonNode data = root.path("data");
            if (data.isArray() && data.size() > 0) {
                for (JsonNode n : data)
                    addIfPresent(dedup, n);
            } else {
                JsonNode items = root.path("response").path("body").path("items").path("item");
                if (items.isArray()) {
                    for (JsonNode n : items)
                        addIfPresent(dedup, items);
                } else if (items.isObject()) {
                    addIfPresent(dedup, items);
                } else {
                    for (JsonNode n : findParentsAny(root, NAME_KEYS))
                        addIfPresent(dedup, n);
                    for (JsonNode n : findParentsAny(root, KCAL_KEYS))
                        addIfPresent(dedup, n);
                }
            }
        }
        return new ArrayList<>(dedup.values());
    }

    // 검색 결과에 순위를 매기고 상위 결과를 반환합니다.
    private List<FoodDTO> rankAndFilterResults(List<FoodDTO> candidates, String originalQuery, int perPage) {
        String[] originalWords = originalQuery.toLowerCase().split("\\s+");
        
        return candidates.stream()
            .sorted((a, b) -> {
                String aName = a.getFoodNm().toLowerCase();
                String bName = b.getFoodNm().toLowerCase();
                
                // 1. 키워드 일치 개수 비교
                long aMatches = Arrays.stream(originalWords).filter(word -> aName.contains(word)).count();
                long bMatches = Arrays.stream(originalWords).filter(word -> bName.contains(word)).count();
                if (aMatches != bMatches) {
                    return Long.compare(bMatches, aMatches);
                }

                // 2. 부가 데이터 존재 여부
                // FoodDTO에 단백질, 지방, 탄수화물 필드가 있다고 가정하고 비교합니다.
                // 만약 해당 필드가 없는 경우, FoodDTO 클래스에 필드를 추가해야 합니다.
                // 임시로 칼로리(enerc)만 있는 경우를 가정하여 비교합니다.
                int aHasMoreData = a.getEnerc() != null ? 1 : 0;
                int bHasMoreData = b.getEnerc() != null ? 1 : 0;
                if (aHasMoreData != bHasMoreData) {
                    return Integer.compare(bHasMoreData, aHasMoreData);
                }

                // 3. 이름 길이 비교 (더 짧은 이름이 더 정확할 가능성)
                return Integer.compare(aName.length(), bName.length());
            })
            .limit(perPage)
            .collect(Collectors.toList());
    }

    // JSON 노드에서 식품 정보 추출하여 맵에 추가
    private void addIfPresent(Map<String, FoodDTO> out, JsonNode n) {
        if (n == null || n.isNull())
            return;
        String name = firstText(n, NAME_KEYS);
        if (name.isBlank())
            return;
        Double kcal = firstNumber(n, KCAL_KEYS);
        if (kcal == null)
            return;
        out.putIfAbsent(name, FoodDTO.builder().foodNm(name).enerc(kcal).build());
    }

    // 여러 키 중에서 첫 번째로 찾은 텍스트 값 반환
    private static String firstText(JsonNode n, List<String> keys) {
        for (String k : keys) {
            JsonNode v = n.get(k);
            if (v != null && !v.isNull()) {
                String s = v.asText("").trim();
                if (!s.isEmpty())
                    return s;
            }
        }
        return "";
    }

    // 여러 키 중에서 첫 번째로 찾은 숫자 값 반환
    private static Double firstNumber(JsonNode n, List<String> keys) {
        for (String k : keys) {
            JsonNode v = n.get(k);
            if (v == null || v.isNull())
                continue;
            try {
                if (v.isNumber())
                    return v.doubleValue();
                String raw = v.asText("").trim();
                if (raw.isEmpty())
                    continue;
                raw = raw.replace(",", "");
                StringBuilder sb = new StringBuilder();
                boolean dot = false, sign = false;
                for (char c : raw.toCharArray()) {
                    if (Character.isDigit(c))
                        sb.append(c);
                    else if (c == '.' && !dot) {
                        dot = true;
                        sb.append(c);
                    } else if ((c == '+' || c == '-') && !sign && sb.length() == 0) {
                        sign = true;
                        sb.append(c);
                    } else if (sb.length() > 0)
                        break;
                }
                if (sb.length() > 0)
                    return Double.valueOf(sb.toString());
            } catch (Exception ignore) {
            }
        }
        return null;
    }

    // 여러 키 중 하나라도 포함하는 부모 노드들 찾기
    private static Collection<JsonNode> findParentsAny(JsonNode root, List<String> keys) {
        Set<JsonNode> set = new LinkedHashSet<>();
        for (String k : keys) {
            List<JsonNode> found = root.findParents(k);
            if (found != null)
                set.addAll(found);
        }
        return set;
    }
}
