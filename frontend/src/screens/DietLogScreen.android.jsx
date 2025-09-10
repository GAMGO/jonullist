import React, { useState, useLayoutEffect } from 'react';
import { View, Text, Button, FlatList, StyleSheet, Pressable, SafeAreaView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiPost } from '../config/api';    // 기록된 데이터 백엔드 연결용 
import { useNavigation } from '@react-navigation/native';
import Constants from "expo-constants";   // 안드로이드 제목행 고정 

export default function DietLogScreen() {

  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '🥗 식단 기록',
      headerTitleAlign: 'center',
      headerTintColor: '#000',
    });
  },  [navigation]);

  // **날짜별 기록 관리
  const [mealsByDate, setMealsByDate] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [showPicker, setShowPicker] = useState(false);

  const [mealType, setMealType] = useState('morning');     
  const [food, setFood] = useState('');
  const [calories, setCalories] = useState('');

  // 로컬 기준 날짜(yyyy-mm-dd)
  const dateKey = [
    selectedDate.getFullYear(),
    String(selectedDate.getMonth() + 1).padStart(2, '0'),
    String(selectedDate.getDate()).padStart(2, '0'),
  ].join('-');

  const meals = mealsByDate[dateKey] || {morning: [], lunch: [], dinner: []};

  // 공통 저장 콜백(직접입력+카메라 결과 이걸로 추가)
  const handleAddMeal = async (entry, type) => {
    // entry: {food: String, calorie: number}
    const mealType = type;
    setMealsByDate(prev => ({
      ...prev,
      [dateKey]: {
        morning: prev[dateKey]?.morning ?? [],
        lunch:   prev[dateKey]?.lunch   ?? [],
        dinner:  prev[dateKey]?.dinner  ?? [],
        [mealType]: [ ...(prev[dateKey]?.[mealType] ?? []), entry ],
      },
    }));
   
    // 백엔드로 전송 준비
    try {
      await apiPost('/api/diet/save', {
        date: dateKey,
        type: mealType,
        food: entry.food,
        calories: entry.calories,
      });
    } catch (err) {
      console.error('❌ 백엔드 전송 실패', err && err.message ? err.message : err);
    }
  };

  // **총 칼로리 계산
  const totalCalories = React.useMemo(() => {
    return [...meals.morning, ...meals.lunch, ...meals.dinner]
      .reduce((sum, m) => sum + (m.calories || 0), 0);
  }, [meals.morning, meals.lunch, meals.dinner]);

  // 섹션 렌더러
  const MealSection = ({ label, type }) => (
    <View style={styles.section}>
      {/* 섹션 헤더: 제목 + 버튼 2개(카메라/직접입력) */}
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

      {/* 섹션 리스트 */}
      <FlatList
        data={meals[type]}
        keyExtractor={(_, i) => `${type}-${i}`}
        renderItem={({ item }) => (
          <Text style={styles.item}>
            {item.food} - {item.calories} kcal
          </Text>
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
                  display={Platform.OS === 'android' ? (parseFloat(String(Platform.Version)) >= 14 ? 'inline' : 'spinner') : 'calendar'}
                  themeVariant="light"
                  onChange={(event, date) => {
                    if (date) setSelectedDate(date);
                    if (Platform.OS === 'android') setShowPicker(false);
                  }}
                  style={{ backgroundColor: '#fff', alignSelf: 'center', width: 360 }}
                />
              </View>
            </View>
          </View>
        )}

        {/* 섹션 3개: 아침/점심/저녁 */}
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

  // 날짜 버튼
  dateButton: {
    paddingVertical: 20, paddingHorizontal: 20, alignItems: 'left', marginBottom: 16
  },
  dateText: { fontSize: 20, color: '#333' },

  // 피커
  pickerOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 999 },
  pickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 12 },
  pickerToolbar: {
    height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  pickerBody: {
    height: Platform.OS === 'android' ? (parseFloat(String(Platform.Version)) >= 14 ? 360 : 216) : undefined
  },
  toolbarBtn: { fontSize: 16, color: '#tomato' },
  toolbarTitle: { fontSize: 16, fontWeight: '600', color: '#333' },

  // 섹션
  section: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 22, marginBottom: 14, backgroundColor: '#fafafa'
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  headerActions: { flexDirection: 'row', gap: 8 },

  // 버튼
  primaryBtn: {
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd'
  },
  primaryBtnText: { color: '#000', fontSize: 14, fontWeight: '600' },
  secondaryBtn: {
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: '#ddd'
  },
  secondaryBtnText: { color: '#333', fontSize: 14, fontWeight: '600' },

  item: { fontSize: 16, marginVertical: 6, color: '#333' },
  empty: { fontSize: 14, color: '#999', paddingTop: 4 },
  total: { fontSize: 20, fontWeight: 'bold', marginTop: 8, color: 'tomato' },
});
