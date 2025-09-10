import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, FlatList, Alert, Platform, SafeAreaView, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';

const FAV_KEY = 'FAVORITE_MEALS_V1';

export default function DirectInputScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { onAdd, dateKey, mealType } = route.params || {};
  const [food, setFood] = useState('');
  const [calories, setCalories] = useState('');
  const [favs, setFavs] = useState([]); // [{food, calories}]

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '✍️ 직접 입력',
      headerTitleAlign: 'center',
      headerTintColor: '#000',
    });
  }, [navigation]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(FAV_KEY);
        setFavs(raw ? JSON.parse(raw) : []);
      } catch (e) {
        console.error('즐겨찾기 로드 실패', e?.message || e);
      }
    })();
  }, []);

  const saveFavs = async (next) => {
    setFavs(next);
    try {
      await AsyncStorage.setItem(FAV_KEY, JSON.stringify(next));
    } catch (e) {
      console.error('즐겨찾기 저장 실패', e?.message || e);
    }
  };

  const addToFavs = async () => {
    const kcal = Number(calories);
    if (!food.trim() || !Number.isFinite(kcal) || kcal <= 0) {
      Alert.alert('입력 확인', '음식명과 유효한 칼로리를 입력해주세요.');
      return;
    }
    const exists = favs.some(f => f.food === food.trim() && Number(f.calories) === kcal);
    if (exists) {
      Alert.alert('이미 있음', '이미 즐겨찾기에 있어요.');
      return;
    }
    const next = [{ food: food.trim(), calories: kcal }, ...favs].slice(0, 50);
    await saveFavs(next);
    Alert.alert('즐겨찾기', '즐겨찾기에 저장했어요.');
  };

  const removeFav = async (idx) => {
    const next = favs.filter((_, i) => i !== idx);
    await saveFavs(next);
  };

  const pickFav = (f) => {
    setFood(f.food);
    setCalories(String(f.calories));
  };

  const saveEntry = () => {
    const kcal = Number(calories);
    if (!food.trim() || !Number.isFinite(kcal) || kcal <= 0) {
      Alert.alert('입력 확인', '음식명과 유효한 칼로리를 입력해주세요.');
      return;
    }
    const entry = { food: food.trim(), calories: kcal };
    if (typeof onAdd === 'function') onAdd(entry); // DietLog로 반영
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight:0 }}>
      <View style={styles.container}>
        <Text style={styles.meta}>📅 {dateKey} • 🍽 {mealType === 'morning' ? '아침' : mealType === 'lunch' ? '점심' : '저녁'}</Text>

        {/* 입력 */}
        <View style={styles.inputRow}>
          <TextInput
            placeholder="음식명"
            value={food}
            onChangeText={setFood}
            style={[styles.input, { flex: 1 }]}
            returnKeyType="next"
            placeholderTextColor="#999"
          />
          <TextInput
            placeholder="kcal"
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
            style={[styles.input, { width: 100, textAlign: 'right' }]}
            placeholderTextColor="#999"
          />
        </View>

        {/* 액션 */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <Pressable style={styles.primaryBtn} onPress={saveEntry}>
            <Text style={styles.primaryBtnText}>저장</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={addToFavs}>
            <Text style={styles.secondaryBtnText}>★ 즐겨찾기</Text>
          </Pressable>
        </View>

        {/* 즐겨찾기 */}
        <Text style={styles.sectionTitle}>자주 먹는 식단</Text>
        <FlatList
          data={favs}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index }) => (
            <Pressable
              style={styles.favItem}
              onPress={() => pickFav(item)}
              onLongPress={() => {
                Alert.alert('삭제', `"${item.food} (${item.calories}kcal)" 즐겨찾기를 삭제할까요?`, [
                  { text: '취소' },
                  { text: '삭제', style: 'destructive', onPress: () => removeFav(index) },
                ]);
              }}
            >
              <Text style={styles.favText}>{item.food} · {item.calories} kcal</Text>
              <Text style={styles.favDelHint}>길게 눌러 삭제</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>즐겨찾기가 비어 있어요. 위에서 ★ 버튼으로 추가하세요.</Text>}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, paddingHorizontal: 20, backgroundColor: '#fff', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight +20:20 },
  meta: { fontSize: 14, color: '#666', marginBottom: 12 },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 80 : 20,
    backgroundColor: '#fff', fontSize: 16,
  },

  primaryBtn: {
    backgroundColor: '#007AFF', paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 8, borderWidth: 1, borderColor: '#ddd',
  },
  secondaryBtnText: { color: '#333', fontSize: 16, fontWeight: '600' },

  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: '#333' },
  favItem: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 10,
    padding: 12, marginBottom: 8, backgroundColor: '#fafafa',
  },
  favText: { fontSize: 16, color: '#333' },
  favDelHint: { fontSize: 12, color: '#aaa', marginTop: 4 },
  empty: { fontSize: 14, color: '#999', paddingVertical: 8 },
});
