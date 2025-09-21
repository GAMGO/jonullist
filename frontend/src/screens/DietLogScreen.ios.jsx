import React, { useState, useLayoutEffect, useMemo, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, SafeAreaView, ImageBackground } from 'react-native';
import { apiPost, apiGet } from '../config/api';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { addCalories } from '../utils/calorieStorage';
import { useI18n } from '../i18n/I18nContext'

const EMPTY_DAY = { morning: [], lunch: [], dinner: [] };

export default function DietLogScreen() {
  const navigation = useNavigation();
  const { t } = useI18n();

  // 날짜 상태
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayMeals, setDayMeals] = useState(EMPTY_DAY);
  const [showPicker, setShowPicker] = useState(false);

  // yyyy-mm-dd 포맷 키
  const dateKey = [
    selectedDate.getFullYear(),
    String(selectedDate.getMonth() + 1).padStart(2, '0'),
    String(selectedDate.getDate()).padStart(2, '0'),
  ].join('-');

  // 헤더 설정
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t('HOME_MEAL') ,
      headerTitleAlign: 'center',
      headerTintColor: '#fff',
    });
  }, [navigation, t]);

  // 총 칼로리 계산
  const totalCalories = useMemo(() => {
    return [...dayMeals.morning, ...dayMeals.lunch, ...dayMeals.dinner]
      .reduce((sum, m) => sum + (m.calories || 0), 0);
  }, [dayMeals]);

  // 끼니별 칼로리 합계 함수
  const calcMealCalories = (meals) =>
    meals.reduce((sum, m) => sum + (m.calories || 0), 0);

  // 하루치 데이터 로드
  const fetchDay = useCallback(async (dk) => {
    try {
      const rec = await apiGet(`/api/diet/get?date=${dk}`);

      // 배열 응답일 경우
      if (Array.isArray(rec)) {
        const grouped = { morning: [], lunch: [], dinner: [] };
        rec.forEach(r => {
          if (r.mealType && grouped[r.mealType]) {
            grouped[r.mealType].push({
              food: r.food,
              calories: r.calories,
              timestamp: r.timestamp,
            });
          }
        });
        setDayMeals(grouped);
        return;
      }

      // 객체 응답일 경우
      const details = typeof rec?.mealDetails === 'string'
        ? JSON.parse(rec.mealDetails || '{}')
        : rec?.mealDetails || {};

      const normalized = {
        morning: Array.isArray(details.morning) ? details.morning : [],
        lunch:   Array.isArray(details.lunch)   ? details.lunch   : [],
        dinner:  Array.isArray(details.dinner)  ? details.dinner  : [],
      };

      setDayMeals(normalized);
    } catch (err) {
      console.error("❌ 식단 로드 실패", err);
      setDayMeals(EMPTY_DAY);
    }
  }, []);

  
  // 화면 다시 열릴 때 새로고침
  useFocusEffect(
    useCallback(() => {
      fetchDay(dateKey);
    }, [fetchDay, dateKey])
  );

  // 식단 추가 핸들러
  const handleAddMeal = async (entry, type) => {
    const payload = { ...entry, timestamp: entry.timestamp ?? Date.now() };

    // UI 먼저 반영
    setDayMeals(prev => ({
      morning: type === 'morning' ? [...prev.morning, payload] : prev.morning,
      lunch:   type === 'lunch'   ? [...prev.lunch,   payload] : prev.lunch,
      dinner:  type === 'dinner'  ? [...prev.dinner,  payload] : prev.dinner,
    }));

    // 서버 저장
    try {
      await apiPost('/api/diet/save', {
        date: dateKey,
        type,
        food: payload.food,
        calories: payload.calories,
        timestamp: payload.timestamp,
      });
      if (payload.calories) {
        await addCalories(payload.calories);
      }
    } catch (err) {
      console.error('❌ 백엔드 전송 실패', err?.message || err);
    }
  };

  // 섹션 컴포넌트
  const MealSection = ({ label, type, calories }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {label} <Text style={{ fontSize: 18, color: '#333' }}>[{calories} {t('CALORIES')}]</Text>
        </Text>
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
                onAdd: entry => handleAddMeal(entry, type),
              })
            }
          >
            <Text style={styles.secondaryBtnText}>➕ {t('DIRECT_INPUT')}</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={dayMeals[type]}
        keyExtractor={(_, i) => `${type}-${i}`}
        renderItem={({ item }) => (
          <View style={styles.mealBlock}>
            <Text style={styles.item} numberOfLines={1}>
              {item.food},
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('NO_REC')}</Text>}
        scrollEnabled
        horizontal
        showsHorizontalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ width: 1 }} />}
      />
    </View>
  );

  return (
    <ImageBackground
      source={require('../../assets/background/dietLog.png')}
      style={ {flex: 1 }}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>

          {/* 날짜 선택 */}
          <Pressable style={styles.dateButton} onPress={() => setShowPicker(true)}>
            <Text style={styles.dateText}>Date: [{dateKey}]</Text>
          </Pressable>

          {showPicker && (
            <View style={styles.pickerOverlay}>
              <Pressable style={styles.pickerBackdrop} onPress={() => setShowPicker(false)} />
              <View style={styles.pickerSheet}>
                <View style={styles.pickerToolbar}>
                  <Pressable onPress={() => setShowPicker(false)}>
                    <Text style={styles.toolbarBtn}>{t('CANCEL')}</Text>
                  </Pressable>
                  <Text style={styles.toolbarTitle}>{t('DATE')}</Text>
                  <Pressable onPress={() => setShowPicker(false)}>
                    <Text style={styles.toolbarBtn}>{t('DONE')}</Text>
                  </Pressable>
                </View>
                <View style={styles.pickerBody}>
                  <Calendar
                    initialDate={dateKey}
                    enableSwipeMonths
                    onDayPress={(d) => {
                      setSelectedDate(new Date(d.dateString));
                    }}
                    markedDates={{
                      [dateKey]: { selected: true, selectedColor: 'tomato', selectedTextColor: '#fff' },
                    }}
                    style={{ alignSelf: 'center', width: '100%' }}
                    theme={{
                      textDayFontFamily: 'DungGeunMo',
                      textMonthFontFamily: 'DungGeunMo',
                      textDayHeaderFontFamily: 'DungGeunMo',
                      textDayFontSize: 16,
                      textMonthFontSize: 18,
                      textDayHeaderFontSize: 12,
                      selectedDayBackgroundColor: 'tomato',
                      selectedDayTextColor: '#fff',
                      todayTextColor: 'tomato',
                      arrowColor: 'tomato',
                    }}
                  />
                </View>
              </View>
            </View>
          )}

          {/* 섹션 3개 */}
          <MealSection label={t('MORNING')} type="morning" calories={calcMealCalories(dayMeals.morning)} />
          <MealSection label={t('LUNCH')} type="lunch" calories={calcMealCalories(dayMeals.lunch)} />
          <MealSection label={t('DINNER')} type="dinner" calories={calcMealCalories(dayMeals.dinner)} />

          {/* 총 칼로리 */}
          <Text style={styles.total}>Total : {totalCalories} {t('CALORIES')}</Text>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: 'transparent' 
  },
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: 'transparent' 
  },

  // 날짜 버튼
  dateButton: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 24,
    color: '#fff',
    fontFamily: 'DungGeunMo',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 5, height: 5 },
    textShadowRadius: 2,
  },

  // 피커
  pickerOverlay: { 
    position: 'absolute', 
    left: 0, 
    right: 0, 
    top: 0, 
    bottom: 0, 
    justifyContent: 'flex-end', 
    zIndex: 999 
  },
  pickerBackdrop: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.35)' 
  },
  pickerSheet: { 
    backgroundColor: '#fff',  
    borderTopLeftRadius: 16, 
    borderTopRightRadius: 16, 
    paddingBottom: 12 
  },
  pickerToolbar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pickerBody: { 
    height: 360 
  },

  toolbarBtn: { 
    fontSize: 16, 
    color: 'tomato', 
    fontFamily: 'DungGeunMo' 
  },
  toolbarTitle: { 
    fontSize: 16, 
    color: '#333', 
    fontFamily: 'DungGeunMo' 
  },

  // 식단
  mealBlock: { 
    padding: 6, 
    alignItems: 'flex-start' 
  },
  section: {
    borderWidth: 4,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 22,
    height: 130,
    marginBottom: 15,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    gap: 8 
  },
  sectionTitle: { 
    fontSize: 22, 
    color: '#333', 
    fontFamily: 'DungGeunMo' 
  },
  headerActions: { 
    flexDirection: 'row', 
    gap: 8 
  },

  // 버튼
  primaryBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  primaryBtnText: { 
    color: '#000', 
    fontSize: 14, 
    fontFamily: 'DungGeunMo' 
  },
  secondaryBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  secondaryBtnText: { 
    color: '#333', 
    fontSize: 12, 
    fontFamily: 'DungGeunMo' 
  },

  // 리스트/텍스트
  item: { 
    fontSize: 16, 
    marginVertical: 6, 
    color: '#333', 
    fontFamily: 'DungGeunMo' 
  },
  empty: { 
    fontSize: 14, 
    color: '#999', 
    paddingTop: 4, 
    fontFamily: 'DungGeunMo' 
  },
  total: {
    fontSize: 30,
    marginTop: 30,
    color: '#fff',
    textAlign: 'right',
    fontFamily: 'DungGeunMo',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 2
  },
});
