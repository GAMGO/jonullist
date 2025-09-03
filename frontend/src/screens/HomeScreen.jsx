import { View, Pressable, Image, ImageBackground } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'

const ICON_SIZE = 96
const LABEL_SIZE = 70
const OVERLAP = 50

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const nav = useNavigation()

  const IconLabeled = ({ iconSrc, labelSrc, to }) => (
    <Pressable
      onPress={() => nav.navigate(to)}
      style={{ alignItems: 'center' }}
    >
      <Image
        source={iconSrc}
        style={{ width: ICON_SIZE, height: ICON_SIZE, resizeMode: 'contain' }}
      />
      <Image
        source={labelSrc}
        style={{
          width: ICON_SIZE + 24,
          height: LABEL_SIZE,
          resizeMode: 'contain',
          marginTop: -OVERLAP,
        }}
      />
    </Pressable>
  )

  return (
    <ImageBackground source={require('../../assets/background/home.png')} style={{ flex: 1 }} resizeMode="cover">
      <View style={{ flex: 1 }}>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 150, alignItems: 'center' }}>
          <Image source={require('../../assets/characters/hero.png')} style={{ width: 260, height: 268, resizeMode: 'contain' }} />
        </View>

        <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}>
            <IconLabeled
              iconSrc={require('../../assets/icons/profile.png')}
              labelSrc={require('../../assets/icons/profile_.png')}
              to="Home"
            />
            <IconLabeled
              iconSrc={require('../../assets/icons/camera.png')}
              labelSrc={require('../../assets/icons/camera_.png')}
              to="Camera"
            />
            <IconLabeled
              iconSrc={require('../../assets/icons/setting.png')}
              labelSrc={require('../../assets/icons/setting_.png')}
              to="Settings"
            />
          </View>
        </View>
      </View>
    </ImageBackground>
  )
}
