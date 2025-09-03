import { useRef, useState, forwardRef } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import * as CameraKit from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';

const Cam = forwardRef(({ facing, flash, style }, ref) => {
  const isNew = !!CameraKit.CameraView;
  if (isNew) {
    return <CameraKit.CameraView ref={ref} style={style} facing={facing} flash={flash} enableZoomGesture />;
  } else {
    const type = facing === 'back' ? CameraKit.CameraType.back : CameraKit.CameraType.front;
    const flashMode = flash === 'on' ? CameraKit.Camera.Constants.FlashMode.on : CameraKit.Camera.Constants.FlashMode.off;
    return <CameraKit.Camera ref={ref} style={style} type={type} flashMode={flashMode} />;
  }
});

export default function CameraScreen(){
  const [perm, requestPerm] = CameraKit.useCameraPermissions();
  const camRef = useRef(null);
  const [facing,setFacing]=useState('back');
  const [flash,setFlash]=useState('off');
  const [preview,setPreview]=useState(null);

  if(!perm) return <View style={{flex:1}}/>;
  if(!perm.granted) return (
    <View style={{flex:1,alignItems:'center',justifyContent:'center',gap:12}}>
      <Text>카메라 권한이 필요합니다</Text>
      <TouchableOpacity onPress={requestPerm} style={{padding:12,backgroundColor:'#111',borderRadius:10}}>
        <Text style={{color:'#fff'}}>권한 허용</Text>
      </TouchableOpacity>
    </View>
  );

  const take = async ()=>{
    const photo = await camRef.current.takePictureAsync({ quality:0.8, skipProcessing:true });
    const small = await ImageManipulator.manipulateAsync(photo.uri,[{resize:{width:1200}}],{compress:0.75,format:ImageManipulator.SaveFormat.JPEG});
    setPreview({uri:small.uri});
  };

  return (
    <View style={{flex:1,backgroundColor:'#000'}}>
      {!preview ? (
        <>
          <Cam ref={camRef} style={{flex:1}} facing={facing} flash={flash} />
          <View style={{position:'absolute',bottom:24,width:'100%',alignItems:'center',gap:14}}>
            <View style={{flexDirection:'row',gap:12}}>
              <TouchableOpacity onPress={()=>setFacing(facing==='back'?'front':'back')} style={{padding:10,backgroundColor:'rgba(255,255,255,0.15)',borderRadius:10}}>
                <Text style={{color:'#fff'}}>전환</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=>setFlash(flash==='off'?'on':'off')} style={{padding:10,backgroundColor:'rgba(255,255,255,0.15)',borderRadius:10}}>
                <Text style={{color:'#fff'}}>플래시 {flash}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={take} style={{width:80,height:80,borderRadius:40,backgroundColor:'#fff'}}/>
          </View>
        </>
      ) : (
        <View style={{flex:1}}>
          <Image source={{uri:preview.uri}} style={{flex:1,resizeMode:'contain',backgroundColor:'#111'}}/>
          <View style={{padding:16,backgroundColor:'#000',gap:12}}>
            <TouchableOpacity onPress={()=>setPreview(null)} style={{padding:14,backgroundColor:'#374151',borderRadius:10}}>
              <Text style={{color:'#fff',textAlign:'center'}}>다시 찍기</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
