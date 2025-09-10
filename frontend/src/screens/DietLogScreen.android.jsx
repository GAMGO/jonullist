import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Pressable, Image } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiPost } from '../config/api';    // 기록된 데이터 백엔드 연결용 
import { useNavigation } from '@react-navigation/native';

export default function DietLog() {

  const nav = useNavigation();
  // **날짜별 기록 관리
  const [mealsByDate, setMealsByDate] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [mealType, setMealType] = useState('morning');     
  const [food, setFood] = useState('');
  const [calorie, setCalorie] = useState('');

  // 국제표준형식->날짜(yyyy-mm--dd) 형식만 추출
  const dateKey = selectedDate.toISOString().split('T')[0];   


  const addMeal = async () => {
    if (!food || !calorie) return;

    const newEntry = { food, calorie: Number(calorie) };

    setMealsByDate({
      ...mealsByDate,
      [dateKey]: {
        ...mealsByDate[dateKey],
        [mealType]: [...(mealsByDate[dateKey]?.[mealType] || []), newEntry],
      },
    });

    // 백엔드로 전송 준비
    try {
      await apiPost('/diet/save', {
        date: dateKey,
        type: mealType,
        food,
        calorie: Number(calorie),
      });
      console.log('✅ 백엔드 전송 성공');
    } catch (err) {
      console.error('❌ 백엔드 전송 실패', err.message);
    }

    setFood('');
    setCalorie('');
  };

  // **총 칼로리 계산
  const meals = mealsByDate[dateKey] || { morning: [], lunch: [], dinner: [] };
  const totalCalories =
    meals.morning.concat(meals.lunch, meals.dinner).reduce((sum, m) => sum + m.calorie, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🥗 식단 기록</Text>

      {/* 날짜 선택 */}
      <DateTimePicker
        value={selectedDate}
        mode="date"
        display="default"
        onChange={(event, date) => date && setSelectedDate(date)}
      />

      <View style={styles.mealTypeContainer}>
        <View style={styles.mealButtonWrap}>
          <Button title="아침" onPress={() => setMealType('morning')} />
          <Pressable onPress={()=> nav.navigate('Camera', {type: 'mornig'})}>
            <Text style={styles.cameraButton}>📷</Text>
          </Pressable>
        </View>
          
        <View style={styles.mealButtonWrap}>
          <Button title="점심" onPress={() => setMealType('lunch')} />
          <Pressable onPress={()=> nav.navigate('Camera', {type: 'lunch'})}>
            <Text style={styles.cameraButton}>📷</Text>
          </Pressable>
        </View>
          
        <View style={styles.mealButtonWrap}>
          <Button title="저녁" onPress={() => setMealType('dinner')} />
          <Pressable onPress={()=> nav.navigate('Camera', {type: 'dinner'})}>
            <Text style={styles.cameraButton}>📷</Text>
          </Pressable>
        </View>
      </View>
     
      <TextInput
        placeholder="음식 이름"
        value={food}
        onChangeText={setFood}
        style={styles.input}
      />
      <TextInput
        placeholder="칼로리"
        value={calorie}
        onChangeText={setCalorie}
        keyboardType="numeric"
        style={styles.input}
      />
      <Button title="추가" onPress={addMeal} />

      {/* 기록 리스트 */}
      <FlatList
        data={meals[mealType]}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <Text style={styles.item}>
            {item.food} - {item.calorie} kcal
          </Text>
        )}
      />

      {/* 총 칼로리 */}
      <Text style={styles.total}>🔥 총 칼로리: {totalCalories} kcal</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  mealTypeContainer:{ flexDirection: 'column', gap: 12, marginBottom: 20},
  mealButtonWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 10},
  cameraIcon: { width: 32, height: 32, resizeMode: 'contain'},
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5 },
  item: { fontSize: 16, marginVertical: 4 },
  total: { fontSize: 18, fontWeight: 'bold', marginTop: 20, color: 'tomato' },
});

