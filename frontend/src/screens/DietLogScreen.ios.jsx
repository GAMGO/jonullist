import React, { useState, useLayoutEffect, useMemo, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, SafeAreaView, Platform, ImageBackground } from 'react-native';
import { apiPost, apiGet } from '../config/api';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { addCalories } from '../utils/calorieStorage';

const EMPTY_DAY = { morning: [], lunch: [], dinner: [] };

export default function DietLogScreen() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t('HOME_MEAL'),
      headerTitleAlign: 'center',
      headerTintColor: '#fff',
      // // 헤더 타이틀 폰트 지정
      // headerTitleStyle: { fontFamily: 'DungGeunMo', fontWeight: 'normal'},
      // headerBackTitleVisible: false 
    });
  }, [navigation]);

  // 하루치만 관리
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayMeals, setDayMeals] = useState(EMPTY_DAY);
  const [showPicker, setShowPicker] = useState(false);

  // yyyy-mm-dd
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
    } catch {
      // 기록 없으면 빈값
      setDayMeals(EMPTY_DAY);
    }
  }, []);

  // 날짜 바뀌면 로드
  useEffect(() => {
    const syncDayAndCalories = async () => {
      await fetchDay(dateKey);

      // 기존에 저장된 식단 칼로리도 로컬 스토리지에 반영
      const total = [...dayMeals.morning, ...dayMeals.lunch, ...dayMeals.dinner]
      .reduce((sum, m) => sum + (m.calories || 0),0);

      await addCalories(total, true);   // 두번쨰 인자로 "덮어쓰기"
    };

    syncDayAndCalories();
  }, [dateKey, fetchDay, dayMeals]);

  // 화면 복귀 시 로드
  useFocusEffect(
    useCallback(() => {
      fetchDay(dateKey);
    }, [fetchDay, dateKey])
  );

  // 끼니별 칼로리 합계
  const calcMealCalories = (meals) =>
    meals.reduce((sum, m) => sum + (m.calories || 0), 0);

  // 공통 추가 콜백 (UI 먼저 반영 후 서버 저장)
  const handleAddMeal = async (entry, type) => {
    const payload = { ...entry, timestamp: entry.timestamp ?? Date.now() };

    // 1) UI 먼저 반영
    setDayMeals(prev => ({
      morning: type === 'morning' ? [...prev.morning, payload] : prev.morning,
      lunch:   type === 'lunch'   ? [...prev.lunch,   payload] : prev.lunch,
      dinner:  type === 'dinner'  ? [...prev.dinner,  payload] : prev.dinner,
    }));

    // 2) 백엔드 저장(뒤에서. UI 딜레이 방지)
    try {
      await apiPost('/api/diet/save', {
        date: dateKey,
        type,
        food: payload.food,
        calories: payload.calories,
        timestamp: payload.timestamp,
      });
      if (payload.calories) {
        await addCalories(payload.calories);    // 로컬 칼로리 합계 반영
        // navigation.navigate('Home', {addCalories: payload.calories})    // 홈 게이지바 업데이트
      }
      // 서버가 정규화/집계하면 아래 재조회 활성화
      // await fetchDay(dateKey);
    } catch (err) {
      console.error('❌ 백엔드 전송 실패', err?.message || err);
    }
  };

  const MealSection = ({ label, type, calories }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {label} <Text style={{ fontSize: 18, color: '#333'}}>[{calories} {t('CALORIES')}]</Text>
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
            <Text 
              style={styles.item} 
              numberOfLines={1}   // 한줄로 제한
            >
              {item.food},
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('NO_REC')}</Text>}
        scrollEnabled={true}
        horizontal={true}
        showsHorizontalScrollIndicator={false}    // 스크롤바 숨김
        ItemSeparatorComponent={() => <View style={{ width: 1 }} />} 
      />
    </View>
  );

  return (

    <ImageBackground
        source={require('../../assets/background/dietLog.png')} 
        style={{flex:1}}
        resizeMode="cover">

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
                <Pressable onPress={() => setShowPicker(false)}><Text style={styles.toolbarBtn}>{t('CANCEL')}</Text></Pressable>
                <Text style={styles.toolbarTitle}>{t('DATE')}</Text>
                <Pressable onPress={() => setShowPicker(false)}><Text style={styles.toolbarBtn}>{t('DONE')}</Text></Pressable>
              </View>
              <View style={styles.pickerBody}>
                  <Calendar
                    initialDate={dateKey}
                    enableSwipeMonths
                    onDayPress={(d) => {
                      setSelectedDate(new Date(d.dateString))
                    }}
                    markedDates={{ 
                      [dateKey]: { selected: true, selectedColor: 'tomato', selectedTextColor: '#fff' } }}
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
        <Text style={styles.total}>Total : {totalCalories}  {t('CALORIES')}</Text>
        </View>
        </SafeAreaView>
    </ImageBackground>
    
  );
}

const styles = StyleSheet.create({

  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, padding: 20, backgroundColor: 'transparent' },
  // 날짜 버튼
  dateButton: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'flex-start', // 'left'는 유효 값이 아님
    marginBottom: 16,
  },
  dateText: { 
    fontSize: 24, 
    color: '#fff',  
    fontFamily: 'DungGeunMo', 
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 2 ,
  },

  // 피커
  pickerOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 999 },
  pickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 12 },
  pickerToolbar: {
    height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  pickerBody: { height: 360 },

  toolbarBtn: { fontSize: 16, color: 'tomato',  fontFamily: 'DungGeunMo' },
  toolbarTitle: { fontSize: 16, color: '#333',  fontFamily: 'DungGeunMo' },

  mealBlock: {
    padding: 6, alignItems: 'left'
  },

  // 섹션
  section: {
    borderWidth: 4, borderColor: '#eee', borderRadius: 12, padding: 22, height: 130, marginBottom: 15, backgroundColor: 'rgba(255,255,255,0.8)'
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8
  },
  sectionTitle: { fontSize: 22, color: '#333',  fontFamily: 'DungGeunMo' },

  headerActions: { flexDirection: 'row', gap: 8 },

  // 버튼
  primaryBtn: {
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd',
  },
  primaryBtnText: { color: '#000', fontSize: 14,  fontFamily: 'DungGeunMo' },
  secondaryBtn: {
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: '#ddd',
  },
  secondaryBtnText: { color: '#333', fontSize: 12,  fontFamily: 'DungGeunMo' },

  item: { fontSize: 16, marginVertical: 6, color: '#333',  fontFamily: 'DungGeunMo'},
  empty: { fontSize: 14, color: '#999', paddingTop: 4,  fontFamily: 'DungGeunMo' },
  total: { fontSize: 30, marginTop: 30, color: '#fff', textAlign: 'right',  fontFamily: 'DungGeunMo', textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 2  },
});
