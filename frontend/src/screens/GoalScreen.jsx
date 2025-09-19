// src/screens/GoalScreen.jsx

import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { apiPost, ORIGIN } from '../config/api.js'
import { useAuth } from '../context/AuthContext'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFonts } from 'expo-font'
import { useI18n } from '../i18n/I18nContext'

const FONT = 'DungGeunMo'

export default function GoalScreen({ navigation }) {
  const { markGoalDone } = useAuth()
  const { t } = useI18n()
  const [targetWeight, setTargetWeight] = useState('')
  const [targetCalories, setTargetCalories] = useState('')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('F')
  const [saving, setSaving] = useState(false)

  const [fontsLoaded] = useFonts({
    [FONT]: require('../../assets/fonts/DungGeunMo.otf'),
  })
  if (!fontsLoaded) return null

  useEffect(() => {
    ;(async () => {
      try {
        const raw = await AsyncStorage.getItem('goal_draft')
        if (!raw) return
        const d = JSON.parse(raw)
        if (d?.weight != null) setWeight(String(d.weight))
        if (d?.height != null) setHeight(String(d.height))
        if (d?.age != null) setAge(String(d.age))
        if (d?.gender != null) setGender(String(d.gender))
        if (d?.targetWeight != null) setTargetWeight(String(d.targetWeight))
        if (d?.targetCalories != null) setTargetCalories(String(d.targetCalories))
      } catch (e) {
        console.error('Failed to load goal_draft', e)
      }
    })()
  }, [])

  const submit = async () => {
    if (!weight || !height || !age || !gender || !targetWeight || !targetCalories) {
      Alert.alert(t('INPUT_REQUIRED'), t('REQUIRED_ALL'))
      return
    }

    const data = {
      weight: +weight,
      height: +height,
      age: +age,
      gender,
      targetWeight: +targetWeight,
      targetCalories: +targetCalories,
    }
    setSaving(true)
    try {
      await apiPost('/api/user/goal', data)
      await AsyncStorage.removeItem('goal_draft')
      markGoalDone()
      Alert.alert(t('UPDATE_OK'), t('GO_HOME'))
      navigation.navigate('Main')
    } catch (e) {
      console.error(e)
      Alert.alert(t('UPDATE_FAIL'), t('ERR_COMMON'))
    } finally {
      setSaving(false)
    }
  }

  const skip = () => {
    markGoalDone()
    navigation.navigate('Main')
  }

  const inputStyle = {
    fontFamily: FONT,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#f3f4f6' }}
    >
      <View style={{ flex: 1, padding: 20 }}>
        <Text
          style={{
            fontFamily: FONT,
            fontSize: 24,
            fontWeight: 'bold',
            marginBottom: 20,
            color: '#111827',
          }}
        >
          {t('GOAL_SETUP')}
        </Text>
        <View style={{ gap: 10, flex: 1 }}>
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: FONT, color: '#4b5563' }}>{t('WEIGHT')}</Text>
            <TextInput
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              placeholder={t('WEIGHT')}
              style={inputStyle}
            />
          </View>
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: FONT, color: '#4b5563' }}>{t('HEIGHT')}</Text>
            <TextInput
              value={height}
              onChangeText={setHeight}
              keyboardType="numeric"
              placeholder={t('HEIGHT')}
              style={inputStyle}
            />
          </View>
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: FONT, color: '#4b5563' }}>{t('AGE')}</Text>
            <TextInput
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              placeholder={t('AGE')}
              style={inputStyle}
            />
          </View>
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: FONT, color: '#4b5563' }}>{t('TARGET_WEIGHT')}</Text>
            <TextInput
              value={targetWeight}
              onChangeText={setTargetWeight}
              keyboardType="numeric"
              placeholder={t('TARGET_WEIGHT')}
              style={inputStyle}
            />
          </View>
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: FONT, color: '#4b5563' }}>{t('TARGET_CALORIES')}</Text>
            <TextInput
              value={targetCalories}
              onChangeText={setTargetCalories}
              keyboardType="numeric"
              placeholder={t('TARGET_CALORIES')}
              style={inputStyle}
            />
          </View>
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: FONT, color: '#4b5563' }}>{t('GENDER')}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setGender('F')}
                style={{
                  flex: 1,
                  padding: 12,
                  borderWidth: 1,
                  borderRadius: 8,
                  backgroundColor: gender === 'F' ? '#fecaca' : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontFamily: FONT }}>{t('FEMALE')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setGender('M')}
                style={{
                  flex: 1,
                  padding: 12,
                  borderWidth: 1,
                  borderRadius: 8,
                  backgroundColor: gender === 'M' ? '#bfdbfe' : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontFamily: FONT }}>{t('MALE')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={submit}
          disabled={saving}
          style={{ backgroundColor: '#ef4444', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 }}
        >
          <Text style={{ color: 'white', fontFamily: FONT }}>
            {saving ? `${t('PROCESSING')}...` : t('SAVE_AND_START')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={skip} style={{ alignItems: 'center', padding: 10 }}>
          <Text style={{ fontFamily: FONT }}>{t('SAVE_LATER')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}