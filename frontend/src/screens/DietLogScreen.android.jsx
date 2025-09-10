import React, { useState, useLayoutEffect, useMemo, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, SafeAreaView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiPost, apiGet } from '../config/api';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';

const EMPTY_DAY = { morning: [], lunch: [], dinner: [] };

export default function DietLogScreen() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '🥗 식단 기록',
      headerTitleAlign: 'center',
      headerTintColor: '#000',
    });
  }, [navigation]);

  // 날짜 & 당일 식단만 관리
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayMeals, setDayMeals] = useState(EMPTY_DAY);
  const [showPicker, setShowPicker] = useState(false);

  const dateKey = [
    selectedDate.getFullYear(),
    String(selectedDate.getMonth() + 1).padStart(2, '0'),
    String(selectedDate.getDate()).padStart(2, '0'),
  ].join('-');

  // 총 칼로리
  const totalCalories = useMemo(() => {
    return [...dayMeals.morning, ...dayMeals.lunch, ...dayMeals.dinner]
      .reduce((sum, m) => sum + (m.calories || 0), 0);
  }, [dayMeals]);

  // 백엔드에서 하루치 로드
  const fetchDay = useCallback(async (dk) => {
    try {
      const rec = await apiGet(`/api/diet/get?date=${dk}`);
      const details = typeof rec?.mealDetails === 'string'
        ? JSON.parse(rec.mealDetails || '{}')
        : rec?.mealDetails || {};

      const normalized = {
        morning: Array.isArray(details.morning) ? details.morning : [],
        lunch:   Array.isArray(details.lunch)   ? details.lunch   : [],
        dinner:  Array.isArray(details.dinner)  ? details.dinner  : [],
      };
      setDayMeals(normalized);
    } catch (e) {
      // 기록이 없으면 빈값 유지
      setDayMeals(EMPTY_DAY);
    }
  }, []);

  // 날짜가 바뀌면 해당 날짜 로드
  useEffect(() => {
    fetchDay(dateKey);
  }, [dateKey, fetchDay]);

  // 화면 복귀 시(포커스) 재로드
  useFocusEffect(
    useCallback(() => {
      fetchDay(dateKey);
    }, [fetchDay, dateKey])
  );

  // 공통 추가 콜백 (UI 즉시 반영 + 백엔드 저장)
  const handleAddMeal = async (entry, type) => {
    const payload = { ...entry, timestamp: entry.timestamp ?? Date.now() };

    // 1) 화면 즉시 반영
    setDayMeals(prev => ({
      morning: type === 'morning' ? [...prev.morning, payload] : prev.morning,
      lunch:   type === 'lunch'   ? [...prev.lunch,   payload] : prev.lunch,
      dinner:  type === 'dinner'  ? [...prev.dinner,  payload] : prev.dinner,
    }));

    // 2) 백엔드 저장
    try {
      await apiPost('/api/diet/save', {
        date: dateKey,
        type,
        food: payload.food,
        calories: payload.calories,
        timestamp: payload.timestamp,
      });
      // (선택) 서버가 집계/정규화한다면 다시 fetch해서 동기화
      // await fetchDay(dateKey);
    } catch (err) {
      console.error('❌ 백엔드 전송 실패', err?.message || err);
      // 실패 시 필요하면 롤백 로직 추가
    }
  };

  // 섹션 렌더러
  const MealSection = ({ label, type }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{label}</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Camera', { type })}
          >
            <Text style={styles.primaryBtnText}>📷</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() =>
              navigation.navigate('DirectInput', {
                dateKey,
                mealType: type,
                onAdd: (entry) => handleAddMeal(entry, type),
              })
            }
          >
            <Text style={styles.secondaryBtnText}>➕직접 입력</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={dayMeals[type]}
        keyExtractor={(_, i) => `${type}-${i}`}
        renderItem={({ item }) => (
          <Text style={styles.item}>{item.food} - {item.calories} kcal</Text>
        )}
        ListEmptyComponent={<Text style={styles.empty}>아직 기록이 없어요.</Text>}
        scrollEnabled={false}
        contentContainerStyle={{ paddingTop: 4 }}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* 날짜 선택 */}
        <Pressable style={styles.dateButton} onPress={() => setShowPicker(true)}>
          <Text style={styles.dateText}>📅 {dateKey}</Text>
        </Pressable>

        {showPicker && (
          <View style={styles.pickerOverlay}>
            <Pressable style={styles.pickerBackdrop} onPress={() => setShowPicker(false)} />
            <View style={styles.pickerSheet}>
              <View style={styles.pickerToolbar}>
                <Pressable onPress={() => setShowPicker(false)}><Text style={styles.toolbarBtn}>취소</Text></Pressable>
                <Text style={styles.toolbarTitle}>날짜 선택</Text>
                <Pressable onPress={() => setShowPicker(false)}><Text style={styles.toolbarBtn}>완료</Text></Pressable>
              </View>
              <View style={styles.pickerBody}>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={
                    Platform.OS === 'android'
                      ? (parseFloat(String(Platform.Version)) >= 14 ? 'inline' : 'spinner')
                      : 'calendar'
                  }
                  themeVariant="light"
                  onChange={(event, date) => {
                    if (date) setSelectedDate(date);   // -> dateKey 변경 -> fetchDay 자동 호출
                    if (Platform.OS === 'android') setShowPicker(false);
                  }}
                  style={{ backgroundColor: '#fff', alignSelf: 'center', width: 360 }}
                />
              </View>
            </View>
          </View>
        )}

        {/* 섹션 3개 */}
        <MealSection label="아침" type="morning" />
        <MealSection label="점심" type="lunch" />
        <MealSection label="저녁" type="dinner" />

        {/* 총 칼로리 */}
        <Text style={styles.total}>🔥 총 칼로리: {totalCalories} kcal</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: Constants.statusBarHeight + 30, backgroundColor: '#fff' },

  dateButton: { paddingVertical: 20, paddingHorizontal: 20, alignItems: 'flex-start', marginBottom: 16 }, // 'left' -> 'flex-start'
  dateText: { fontSize: 20, color: '#333' },

  pickerOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 999 },
  pickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 12 },
  pickerToolbar: {
    height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  pickerBody: { height: Platform.OS === 'android' ? (parseFloat(String(Platform.Version)) >= 14 ? 360 : 216) : undefined },
  toolbarBtn: { fontSize: 16, color: '#tomato' },
  toolbarTitle: { fontSize: 16, fontWeight: '600', color: '#333' },

  section: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 22, marginBottom: 14, backgroundColor: '#fafafa' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  headerActions: { flexDirection: 'row', gap: 8 },

  primaryBtn: {
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd',
  },
  primaryBtnText: { color: '#000', fontSize: 14, fontWeight: '600' },
  secondaryBtn: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  secondaryBtnText: { color: '#333', fontSize: 14, fontWeight: '600' },

  item: { fontSize: 16, marginVertical: 6, color: '#333' },
  empty: { fontSize: 14, color: '#999', paddingTop: 4 },
  total: { fontSize: 20, fontWeight: 'bold', marginTop: 8, color: 'tomato' },
});
