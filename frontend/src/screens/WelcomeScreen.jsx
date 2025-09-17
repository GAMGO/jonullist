import React from 'react';
import { View, Image, ImageBackground, Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const BG = require('../../assets/background/main.png');
const LOGIN = require('../../assets/ui/loginbtn.png');
const SIGNUP = require('../../assets/ui/signupbtn.png');
const SETTING = require('../../assets/ui/settingbtn.png');

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const nav = useNavigation();

  const loginMeta = Image.resolveAssetSource(LOGIN);
  const signupMeta = Image.resolveAssetSource(SIGNUP);
  const settingMeta = Image.resolveAssetSource(SETTING);


  const baseBtnW = Math.min(300, Math.round(width * 0.45));

  const loginH = Math.round(baseBtnW * (loginMeta.height / loginMeta.width) * 0.85);
  const signupH = Math.round(baseBtnW * (signupMeta.height / signupMeta.width) * 0.85);
  const settingH = Math.round(baseBtnW * (settingMeta.height / settingMeta.width) * 0.85);

  const bottomOffset = insets.bottom;

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: bottomOffset,
          alignItems: 'center',
        }}
      >
        <Pressable onPress={() => nav.navigate('Login')} hitSlop={8}>
          <Image source={LOGIN} style={{ width: baseBtnW, height: loginH, resizeMode: 'contain' }} />
        </Pressable>

        <Pressable onPress={() => nav.navigate('Signup')} hitSlop={8}>
          <Image source={SIGNUP} style={{ width: baseBtnW, height: signupH, resizeMode: 'contain' }} />
        </Pressable>

        <Pressable onPress={() => nav.navigate('Settings', { public: true })} hitSlop={8}>
          <Image source={SETTING} style={{ width: baseBtnW, height: settingH, resizeMode: 'contain' }} />
        </Pressable>
      </View>
    </ImageBackground>
  );
}
