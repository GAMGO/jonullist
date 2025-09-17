import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  Platform,
} from "react-native";
import * as Speech from "expo-speech";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useI18n } from "../i18n/I18nContext";

const { width: W, height: H } = Dimensions.get("window");
const TA_IMG = require("../../assets/char/ta.png");
const STORE_KEY = "@tts/voiceId";

async function resolveVoice() {
  const saved = await AsyncStorage.getItem(STORE_KEY);
  if (saved) return saved;
  try {
    const vs = await Speech.getAvailableVoicesAsync();
    const ko = (vs || []).filter((v) =>
      (v.language || "").toLowerCase().startsWith("ko")
    );
    const male =
      ko.find((v) => String(v.gender || "").toLowerCase() === "male") ||
      ko.find((v) =>
        /male|남성|man|min|male1|male2/i.test(String(v.name || ""))
      );
    return (male || ko[0])?.identifier || null;
  } catch {
    return null;
  }
}

export default function TACoach({ route }) {
const { lang, t, getGreeting, getMotivateMessage, getSpicyMessage, getLocalizedNumber } = useI18n();
  const mode = route?.params?.mode || "squat";
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(0);
  const [voiceId, setVoiceId] = useState(null);
  const intervalMs = 3000;
  const TONES = ["soft", "hard", "mix"];
  const TONE_LABEL = {
    soft: t("TONE_SOFT"),
    hard: t("TONE_HARD"),
    mix: t("TONE_MIX"),
  };
  const [toneIdx, setToneIdx] = useState(0);
  const tone = TONES[toneIdx];
  const toneRef = useRef(tone);

  useEffect(() => {
    toneRef.current = TONES[toneIdx];
  }, [toneIdx]);

  function pickLineByTone() {
    const t = toneRef.current;
    if (t === "soft") return getMotivateMessage();
    if (t === "hard") return getSpicyMessage();
    return Math.random() < 0.5 ? getMotivateMessage() : getSpicyMessage();
  }

  const loopOn = useRef(false);
  const timeoutRef = useRef(null);
  const countRef = useRef(0);
  const lastTauntAt = useRef(0);
  const startedOnceRef = useRef(false);
  const TAUNT_COOLDOWN_MS = 12000;

  function speak(text, rate = 1.0) {
    if (!text) return;
    return new Promise((resolve) => {
      const opts = {
        language: lang,
        rate,
        onDone: resolve,
        onStopped: resolve,
        onError: resolve,
      };
      if (voiceId && typeof voiceId === "string") {
        opts.voice = voiceId;
      } else {
        opts.pitch = 0.85;
      }
      Speech.speak(text, opts);
    });
  }

  function clearTimer() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  async function loop() {
    if (!loopOn.current) return;
    const next = countRef.current + 1;
    setCount(next);
    countRef.current = next;
    const t0 = Date.now();
    const countToSpeak = getLocalizedNumber(next);
    await speak(`${countToSpeak}${t("REPS_UNIT_TTS")}`, 1.03);
    const t1 = Date.now();
    const numberDur = t1 - t0;
    const now = Date.now();
    if (next % 12 === 0 && now - lastTauntAt.current > TAUNT_COOLDOWN_MS) {
      lastTauntAt.current = now;
      await speak(pickLineByTone(), 1.0);
    }
    const rest = Math.max(0, intervalMs - numberDur);
    timeoutRef.current = setTimeout(loop, rest);
  }

  async function startAuto() {
    if (loopOn.current) return;
    loopOn.current = true;
    clearTimer();
    try {
      Speech.stop();
    } catch {}
    if (!startedOnceRef.current) {
      startedOnceRef.current = true;
      await speak(getGreeting(mode), 1.0);
      await speak(t("AUTO_COUNT_START"), 1.0);
    }
    loop();
    setRunning(true);
  }

  function stopAuto() {
    loopOn.current = false;
    clearTimer();
    try {
      Speech.stop();
    } catch {}
    setRunning(false);
  }

  // ✅ 톤 변경 메시지를 i18n으로 변경합니다.
  function cycleTone() {
    const next = (toneIdx + 1) % TONES.length;
    setToneIdx(next);
    if (running)
      speak(t("TONE_CHANGE", { tone: TONE_LABEL[TONES[next]] }), 1.0);
  }

  useEffect(() => {
    resolveVoice().then(setVoiceId);
    if (Platform.OS === "android") {
      Speech.speak("", { language: lang, onDone: () => Speech.stop() });
    }
    return () => {
      stopAuto();
    };
  }, [lang]); // ✅ lang이 변경되면 useEffect를 재실행합니다.

  return (
    <View style={S.wrap}>
      <View style={S.topCenter}>
        <View style={S.modePill}>
          <Text style={S.modeTxt}>{t(mode.toUpperCase()).toUpperCase()}</Text>
        </View>
        <TouchableOpacity onPress={cycleTone} style={S.tonePill}>
          <Text style={S.toneLabel}>{t("TONE_LABEL")}</Text>
          <Text style={S.toneValue}>{TONE_LABEL[tone]}</Text>
        </TouchableOpacity>
      </View>
      <View style={S.charWrap}>
        <Image source={TA_IMG} style={S.charImg} resizeMode="contain" />
      </View>
      <View style={S.countWrap}>
        <Text style={S.countGlow}>{count}</Text>
        <Text style={S.count}>{count}</Text>
        <Text style={S.countUnit}>{t("REPS_UNIT")}</Text>
      </View>
      <View style={S.bottomRow}>
        <TouchableOpacity
          style={[S.ctrlBtn, S.resetBtn]}
          onPress={() => {
            stopAuto();
            setCount(0);
            countRef.current = 0;
            startedOnceRef.current = false;
          }}
        >
          <Text style={S.ctrlTxt}>{t("RESET")}</Text>
        </TouchableOpacity>
        {running ? (
          <TouchableOpacity style={[S.ctrlBtn, S.pauseBtn]} onPress={stopAuto}>
            <Text style={S.ctrlTxt}>{t("PAUSE")}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[S.ctrlBtn, S.startBtn]} onPress={startAuto}>
            <Text style={S.ctrlTxt}>{t("START")}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#05060a" },
  topCenter: {
    position: "absolute",
    top: 28,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 2,
  },
  modePill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  modeTxt: {
    color: "#e8e8ea",
    fontSize: 22,
    letterSpacing: 4,
    fontFamily: "DungGeunMo",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  tonePill: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.12)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.35)",
  },
  toneLabel: {
    color: "#c7d2fe",
    fontSize: 12,
    fontFamily: "DungGeunMo",
    opacity: 0.9,
    letterSpacing: 1,
  },
  toneValue: {
    color: "#93c5fd",
    fontSize: 14,
    fontFamily: "DungGeunMo",
    letterSpacing: 1,
    textShadowColor: "rgba(147,197,253,0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  charWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  charImg: { width: W * 0.78, height: Math.min(W * 0.9, H * 0.5) },
  countWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 128,
    alignItems: "center",
  },
  countGlow: {
    position: "absolute",
    fontSize: 94,
    fontWeight: "900",
    fontFamily: "DungGeunMo",
    color: "transparent",
    textShadowColor: "rgba(59,130,246,0.45)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 22,
  },
  count: {
    color: "#fff",
    fontSize: 86,
    fontWeight: "900",
    fontFamily: "DungGeunMo",
    letterSpacing: 2,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  countUnit: {
    marginTop: 8,
    color: "#cbd5e1",
    fontSize: 12,
    opacity: 0.9,
    fontFamily: "DungGeunMo",
    letterSpacing: 2,
  },
  bottomRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 36,
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  ctrlBtn: {
    minWidth: 120,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    ...(Platform.OS === "android" ? { elevation: 4 } : null),
  },
  ctrlTxt: {
    color: "#fff",
    fontWeight: "800",
    fontFamily: "DungGeunMo",
    letterSpacing: 2,
  },
  startBtn: {
    backgroundColor: "#10b981",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.7)",
  },
  pauseBtn: {
    backgroundColor: "#334155",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.5)",
  },
  resetBtn: {
    backgroundColor: "#ef4444",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.7)",
  },
});
