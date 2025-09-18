import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, FlatList, Alert, Platform, SafeAreaView, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { apiGet, apiPost, apiDelete } from '../config/api';
import { useI18n } from '../i18n/I18nContext'
const FAV_KEY = 'FAVORITE_MEALS_V1';

export default function DirectInputScreen() {
    const { t } = useI18n();
  const navigation = useNavigation();
  const route = useRoute();
  const { onAdd, dateKey, mealType } = route.params || {};
  const [food, setFood] = useState('');
  const [calories, setCalories] = useState('');
  const [favs, setFavs] = useState([]); // [{food, calories}]

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: `✍️ ${t('DIRECT_INPUT')}`,
      headerTitleAlign: 'center',
      headerTintColor: '#fff',
    });
  }, [navigation]);

  useEffect(() => {
    (async () => {

      try {
        const remote= await apiGet('/api/favorite');
        console.log('서버에서 받은 데이터:', remote);
        if (Array.isArray(remote)) {
          setFavs(remote);
          await AsyncStorage.setItem(FAV_KEY, JSON.stringify(remote)); // 로컬 캐싱
        } else {
          const raw = await AsyncStorage.getItem(FAV_KEY);
          setFavs(raw ? JSON.parse(raw) : []);
        }
      } catch (e) {
        console.error('즐겨찾기 로드 실패', e?.message || e);
        const raw = await AsyncStorage.getItem(FAV_KEY);
        setFavs(raw ? JSON.parse(raw) : []);
      }
    })();
  }, []);

  const saveFavs = async (next) => {
    setFavs(next);
    await AsyncStorage.setItem(FAV_KEY, JSON.stringify(next));
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

    try {
      // 입력값으로 UI 먼저 업데이트
       const newFav = { food: food.trim(), calories: kcal };
       const next = [newFav, ...favs].slice(0, 50);
       await saveFavs(next);

      // 서버 저장은 따로 실행 (UI 반영에 영향 안 주게)
      apiPost('/api/favorite', newFav).catch(e => {
         console.error('서버 즐겨찾기 저장 실패', e?.message || e);
      });

      Alert.alert('즐겨찾기', '즐겨찾기에 저장했어요.');
    } catch (e) {
      console.error('서버 즐겨찾기 저장 실패', e?.message || e);
      Alert.alert('오류', '서버에 저장하지 못했습니다.');
    }
  };

  const removeFav = async (idx, id) => {
    const next = favs.filter((_, i) => i !== idx);
    await saveFavs(next);
    try {
      if(id) {
      await apiDelete(`/api/favorite/${id}`); // 서버에서도 삭제
      }
    } catch (e) {
      console.error('서버 즐겨찾기 삭제 실패', e?.message || e);
    }
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
    if (typeof onAdd === 'function') onAdd(entry, mealType); // DietLog로 반영
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#111827', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight:0 }}>
      <View style={styles.container}>
        <Text style={styles.meta}>{dateKey} • 🍽 {mealType === 'morning' ? '아침' : mealType === 'lunch' ? '점심' : '저녁'}</Text>

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
            <Text style={styles.secondaryBtnText}>⭐ 즐겨찾기</Text>
          </Pressable>
        </View>

        {/* 즐겨찾기 */}
        <Text style={styles.sectionTitle}>📌 자주 먹는 식단</Text>
        <FlatList
          data={favs}
          keyExtractor={(item, i) => item.idx ? String(item.idx):String(i)}
          renderItem={({ item, index }) => (
            <Pressable
              style={styles.favItem}
              onPress={() => pickFav(item)}
              onLongPress={() => {
                Alert.alert('삭제', `"${item.food} (${item.calories}kcal)" 즐겨찾기를 삭제할까요?`, [
                  { text: '취소' },
                  { text: '삭제', style: 'destructive', onPress: () => removeFav(index, item.idx || item.id || null) },
                ]);
              }}
            >
              <Text style={styles.favText}>{item.food} · {item.calories} kcal</Text>
              <Text style={styles.favDelHint}>길게 눌러 삭제</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>즐겨찾기가 비어 있어요. 위에서 ⭐ 버튼으로 추가하세요.</Text>}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, paddingHorizontal: 20, backgroundColor: '#111827', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight +20:20 },
  meta: { fontSize: 20, color: '#fff', marginBlockStart: 17, marginBottom: 12, fontFamily: 'DungGeunMo' },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  input: {
    borderWidth: 3, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 20,paddingVertical: 12, backgroundColor: '#fff', fontSize: 20, fontFamily: 'DungGeunMo'
  },
  primaryBtn: {
    backgroundColor: 'tomato', paddingHorizontal: 16, paddingVertical: 12, height: 45,
    borderRadius: 8, justifyContent: 'center', alignItems: 'center'
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontFamily: 'DungGeunMo' },
  secondaryBtn: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, height: 45,
    borderRadius: 8, borderWidth: 1, borderColor: '#ddd'
  },
  secondaryBtnText: { color: '#333', fontSize: 15, fontFamily: 'DungGeunMo' },

  sectionTitle: { fontSize: 18, fontFamily: 'DungGeunMo', marginBlockStart: 17, marginBottom: 15, color: '#fff' },
  favItem: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 10,
    padding: 12, marginBottom: 8, backgroundColor: '#fafafa',
  },
  favText: { fontSize: 16, color: '#333', fontFamily: 'DungGeunMo' },
  favDelHint: { fontSize: 12, color: '#aaa', marginTop: 4, fontFamily: 'DungGeunMo' },
  empty: { fontSize: 14, color: '#999', paddingVertical: 8, fontFamily: 'DungGeunMo' },
});
