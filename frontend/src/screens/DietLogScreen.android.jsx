import React, { useState, useLayoutEffect, useMemo, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, SafeAreaView, Platform, ImageBackground } from 'react-native';
import { apiPost, apiGet } from '../config/api';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import { Calendar } from 'react-native-calendars';

const EMPTY_DAY = { morning: [], lunch: [], dinner: [] };

export default function DietLogScreen() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '식단 기록',
      headerTitleAlign: 'center',
      headerTintColor: '#fff',
    });
  }, [navigation]);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayMeals, setDayMeals] = useState(EMPTY_DAY);
  const [showPicker, setShowPicker] = useState(false);

  const dateKey = [
    selectedDate.getFullYear(),
    String(selectedDate.getMonth() + 1).padStart(2, '0'),
    String(selectedDate.getDate()).padStart(2, '0'),
  ].join('-');

  const totalCalories = useMemo(() => {
    return [...dayMeals.morning, ...dayMeals.lunch, ...dayMeals.dinner]
      .reduce((sum, m) => sum + (m.calories || 0), 0);
  }, [dayMeals]);

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
      setDayMeals(EMPTY_DAY);
    }
  }, []);

  useEffect(() => {
    fetchDay(dateKey);
  }, [dateKey, fetchDay]);

  useFocusEffect(
    useCallback(() => {
      fetchDay(dateKey);
    }, [fetchDay, dateKey])
  );

  const handleAddMeal = async (entry, type) => {
    const payload = { ...entry, timestamp: entry.timestamp ?? Date.now() };
    setDayMeals(prev => ({
      morning: type === 'morning' ? [...prev.morning, payload] : prev.morning,
      lunch:   type === 'lunch'   ? [...prev.lunch,   payload] : prev.lunch,
      dinner:  type === 'dinner'  ? [...prev.dinner,  payload] : prev.dinner,
    }));
    try {
      await apiPost('/api/diet/save', {
        date: dateKey,
        type,
        food: payload.food,
        calories: payload.calories,
        timestamp: payload.timestamp,
      });
    } catch (err) {
      console.error('❌ 백엔드 전송 실패', err?.message || err);
    }
  };

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

    <ImageBackground
            source={require('../../assets/background/dietLog.png')} 
            style={{flex:1}}
            resizeMode="cover">
    
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Pressable style={styles.dateButton} onPress={() => setShowPicker(true)}>
          <Text style={styles.dateText}>Date: [{dateKey}]</Text>
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
                {/* {Platform.OS === 'android' ? ( */}
                  <Calendar
                    initialDate={dateKey}
                    enableSwipeMonths
                    onDayPress={(d) => {
                      setSelectedDate(new Date(d.dateString))
                    }}
                    markedDates={{ 
                      [dateKey]: { 
                        selected: true
                       } }}
                    style={{ alignSelf: 'center', width: '100%' }}
                    theme={{
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

        <MealSection label="아침" type="morning" />
        <MealSection label="점심" type="lunch" />
        <MealSection label="저녁" type="dinner" />

        <Text style={styles.total}>Total : {totalCalories} kcal</Text>
      </View>
    </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({

  safeArea: { flex: 1, backgroundColor: 'transparent' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: Constants.statusBarHeight + 80, backgroundColor: 'transparent' },
  // 날짜 버튼
  dateButton: { paddingVertical: 30, paddingHorizontal: 20, alignItems: 'left', marginBottom: 16 },
  dateText: { fontSize: 22, color: '#fff' },
  // 피커
  pickerOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 999 },
  pickerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 12 },
  pickerToolbar: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  pickerBody: { height: Platform.OS === 'android' ? 360 : undefined },

  toolbarBtn: { fontSize: 16, color: '#333' },
  toolbarTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  // 섹션
  section: { borderWidth: 5, borderColor: '#eee', borderRadius: 12, padding: 22, height: 135, marginBottom: 15, backgroundColor: 'rgba(255,255,255,0.8)' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { fontSize: 20, fontFamily: 'MyCustomFont-Bold', color: '#333' },

  headerActions: { flexDirection: 'row', gap: 8 },
  // 버튼
  primaryBtn: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  primaryBtnText: { color: '#000', fontSize: 13, fontWeight: '600' },
  secondaryBtn: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  secondaryBtnText: { color: '#333', fontSize: 12, fontWeight: '600' },

  item: { fontSize: 13, marginVertical: 6, color: '#333' },
  empty: { fontSize: 13, color: '#999', paddingTop: 4 },
  total: { fontSize: 25, fontFamily: 'MyCustomFont-Bold', marginTop: 40, color: '#fff', textAlign: 'right' },
});
