import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { registerPushToken } from '../api/alarm';

export default function useExpoPushToken() {
  const onceRef = useRef(false);

  useEffect(() => {
    if (onceRef.current) return;
    onceRef.current = true;

    (async () => {
      // 권한 요청
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('알림 권한 거부됨');
        return;
      }

      // Android 채널(헤드업)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 200, 120, 200],
          sound: 'default',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }

      // Expo Push Token
      // EAS 프로젝트의 projectId가 app.json/app.config.js에 있어야 함
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ||
        Constants?.easConfig?.projectId ||
        Constants?.expoConfig?.owner; // fallback

      const tokenResp = await Notifications.getExpoPushTokenAsync({ projectId });
      const expoToken = tokenResp?.data;
      if (!expoToken) return;

      // 서버에 등록
      try {
        await registerPushToken({
          token: expoToken,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
        });
        console.log('Expo Push Token 등록 완료:', expoToken);
      } catch (e) {
        console.warn('토큰 등록 실패', e);
      }
    })();
  }, []);
}
