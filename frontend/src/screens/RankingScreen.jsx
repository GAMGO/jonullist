import { useEffect, useState, useCallback } from 'react'
import { View, Text, ActivityIndicator, FlatList, RefreshControl, StyleSheet, ImageBackground } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'
import { apiGet } from '../config/api'
import { useI18n } from '../i18n/I18nContext'; // 🥳 I18nContext import

const FONT = 'DungGeunMo'
const LIFT = 16

function maskEmail(v) {
  const s = String(v || '')
  const at = s.indexOf('@')
  if (at <= 0) return s
  const local = s.slice(0, at)
  const domain = s.slice(at)
  const keep = local.charAt(0)
  const masked = keep + '*'.repeat(Math.max(local.length - 1, 2))
  return masked + domain
}

export default function RankingScreen() {
  const insets = useSafeAreaInsets()
  const [fontsLoaded] = useFonts({ [FONT]: require('../../assets/fonts/DungGeunMo.otf') })
  const { t } = useI18n(); // 🥳 useI18n hook 사용
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  const candidates = ['/ranking']

  const pullIds = (arr) =>
    arr
      .map(x => {
        if (typeof x === 'string') return x
        if (!x || typeof x !== 'object') return ''
        return x.email ?? x.id ?? x.username ?? ''
      })
      .filter(Boolean)

  const fetchPaged = async (base) => {
    let acc = []
    try {
      const first = await apiGet(`${base}?page=0&size=200`)
      if (Array.isArray(first)) return pullIds(first)
      if (Array.isArray(first?.content)) {
        acc = pullIds(first.content)
        const totalPages = Number(first.totalPages ?? 1)
        for (let p = 1; p < totalPages; p++) {
          const pageRes = await apiGet(`${base}?page=${p}&size=200`)
          acc = acc.concat(pullIds(pageRes?.content || []))
        }
        return acc
      }
      return pullIds(first?.data || first?.users || [])
    } catch {
      return []
    }
  }

  const fetchOnce = async (path) => {
    try {
      const res = await apiGet(path)
      if (Array.isArray(res)) return pullIds(res)
      if (Array.isArray(res?.content)) return pullIds(res.content)
      if (Array.isArray(res?.data)) return pullIds(res.data)
      if (Array.isArray(res?.users)) return pullIds(res.users)
      return []
    } catch {
      return []
    }
  }

  const fetchAllUsers = useCallback(async () => {
    for (const p of candidates) {
      const list = await fetchOnce(p)
      if (list.length) return list
      const paged = await fetchPaged(p)
      if (paged.length) return paged
    }
    return []
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const ids = await fetchAllUsers()
      const uniq = Array.from(new Set(ids))
      uniq.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      setItems(uniq)
      if (uniq.length === 0) setError(t('USERS_EMPTY')) // 🥳 t() 함수 적용
    } catch (e) {
      setError(e?.message || t('LIST_LOAD_FAIL')) // 🥳 t() 함수 적용
    } finally {
      setLoading(false)
    }
  }, [fetchAllUsers, t])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useEffect(() => { load() }, [load])

  if (!fontsLoaded) return null

  const contentTop = insets.top + 100 - LIFT

  if (loading) {
    return (
      <ImageBackground source={require('../../assets/background/home.png')} style={{ flex: 1 }} resizeMode="cover">
        <Text style={[styles.screenTitle, { top: insets.top + 8 }]}>RANKING</Text>
        <View style={[styles.center, { paddingTop: contentTop }]}>
          <View style={[styles.card, styles.lifted]}>
            <ActivityIndicator />
          </View>
        </View>
      </ImageBackground>
    )
  }

  return (
    <ImageBackground source={require('../../assets/background/home.png')} style={{ flex: 1 }} resizeMode="cover">
      <Text style={[styles.screenTitle, { top: insets.top + 8 }]}>RANKING</Text>
      <View style={[styles.wrap, { paddingTop: contentTop }]}>
        <View style={[styles.card, styles.lifted]}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <FlatList
            data={items}
            keyExtractor={(item, idx) => `${item}-${idx}`}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item, index }) => (
              <View style={styles.row}>
                <Text style={styles.rank}>{index + 1}</Text>
                <Text style={styles.email}>{maskEmail(item)}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>{t('RANKING_EMPTY')}</Text>} // 🥳 t() 함수 적용
            contentContainerStyle={items.length === 0 ? { flex: 1, justifyContent: 'center', alignItems: 'center' } : { paddingBottom: 24 }}
          />
        </View>
      </View>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  screenTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#000',
    fontFamily: FONT,
    fontSize: 28,
    fontWeight: 'normal',
    zIndex: 10,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  lifted: { marginTop: -LIFT },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' },
  rank: { width: 40, textAlign: 'center', fontFamily: FONT, fontSize: 18, color: '#ef4444' },
  email: { flex: 1, fontFamily: FONT, fontSize: 16, color: '#111' },
  empty: { fontFamily: FONT, color: '#9ca3af', textAlign: 'center' },
  error: { fontFamily: FONT, color: '#ef4444', textAlign: 'center', marginBottom: 8 }
})