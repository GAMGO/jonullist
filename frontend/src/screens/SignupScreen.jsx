import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { apiPost, API_BASE_DEBUG } from "../config/api";
import { calcBMI, classifyBMI } from "../utils/bmi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { useI18n } from "../i18n/I18nContext"; // 🥳 I18nContext import

const FONT = "DungGeunMo";
const isValidEmail = (v = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
const onlyDigits = (s = "") => s.replace(/\D+/g, "").slice(0, 6);

export default function SignupScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    [FONT]: require("../../assets/fonts/DungGeunMo.otf"),
  });
  const { t } = useI18n(); // 🥳 useI18n hook 사용

  let auth = null;
  try {
    auth = useAuth?.();
  } catch {
    auth = null;
  }

  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("F");
  const [height, setHeight] = useState("");
  const [loading, setLoading] = useState(false); // 인증

  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [leftSec, setLeftSec] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const tickRef = useRef(null);

  const endpoint = useMemo(() => `${API_BASE_DEBUG}/api/auth/signup`, []);

  useEffect(() => {
    if (leftSec <= 0 && tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, [leftSec]);

  function startTimer(sec = 300) {
    setLeftSec(sec);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setLeftSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
  }

  async function signupFallback(payload) {
    const res = await apiPost("/api/auth/signup", payload);
    return !!res;
  }

  const onSubmit = async () => {
    if (!id || !password || !weight || !age || !gender || !height) {
      return Alert.alert(t("REQUIRED"), t("REQUIRED_ALL"));
    }
    if (!isValidEmail(id))
      return Alert.alert(t("FORMAT_ERROR"), t("EMAIL_INVALID"));
    if (String(password).length < 8)
      return Alert.alert(t("FORMAT_ERROR"), t("PW_MIN_8"));

    const w = Number(weight);
    const a = Number(age);
    const h = Number(height);
    if ([w, a, h].some(Number.isNaN))
      return Alert.alert(t("FORMAT_ERROR"), t("NUMERIC_ONLY"));

    const payload = {
      id: id.trim(),
      password,
      weight: w,
      age: a,
      gender,
      height: h,
    };

    try {
      setLoading(true);
      const ok = auth?.signup
        ? await auth.signup(payload)
        : await signupFallback(payload);
      if (!ok) return Alert.alert(t("ERR_COMMON"), t("TRY_AGAIN"));

      await AsyncStorage.multiSet([
        [
          "@profile/prefill",
          JSON.stringify({
            id: payload.id,
            email: payload.id,
            weight: w,
            height: h,
            age: a,
            gender: payload.gender,
          }),
        ],
        [
          "goal_draft",
          JSON.stringify({
            weight: w,
            height: h,
            age: a,
            gender: payload.gender,
          }),
        ],
        ["@avatar/category_prefill", String(classifyBMI(calcBMI(w, h)))],
      ]);

      setSent(true);
      startTimer(300); // ✅ 알림은 없애고, 화면에서 안내 문구만 보여주도록
    } catch (e) {
      Alert.alert(t("ERR_COMMON"), e?.message ?? t("TRY_AGAIN"));
    } finally {
      setLoading(false);
    }
  };

  async function verifyEmailCode() {
    const token = onlyDigits(code);
    if (token.length !== 6)
      return Alert.alert(t("FORMAT_ERROR"), t("VERIFICATION_CODE_PH"));
    try {
      setVerifyLoading(true);
      const res = await apiPost("/api/email/verify", { token });
      if (res?.success) {
        Alert.alert(t("VERIFICATION_DONE"), t("VERIFICATION_DONE_ALERT"));
        navigation.replace("Login");
      } else {
        Alert.alert(
          t("VERIFICATION_FAIL"),
          res?.message ?? t("VERIFICATION_FAIL_MSG")
        );
      }
    } catch (e) {
      Alert.alert(t("SERVER_ERROR"), e?.message ?? t("TRY_AGAIN"));
    } finally {
      setVerifyLoading(false);
    }
  }

  if (!fontsLoaded) return null;

  const inputStyle = {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontFamily: FONT,
  };
  const Button = ({ title, onPress, disabled, bg = "#111827", style }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          backgroundColor: bg,
          padding: 14,
          borderRadius: 10,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      {" "}
      <Text style={{ color: "#fff", textAlign: "center", fontFamily: FONT }}>
        {title}
      </Text>{" "}
    </TouchableOpacity>
  );
  const mmss = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(
      2,
      "0"
    )}`;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      {" "}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 24,
          paddingTop: insets.top + 80,
          gap: 12,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {" "}
        <Text
          style={{
            fontSize: 36,
            fontFamily: FONT,
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          SIGNUP
        </Text>
        {/* 기본 입력 */}{" "}
        <TextInput
          value={id}
          onChangeText={setId}
          placeholder={t("EMAIL_ID")}
          placeholderTextColor="#999"
          autoCapitalize="none"
          keyboardType="email-address"
          style={inputStyle}
        />{" "}
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={t("PASSWORD_8")}
          placeholderTextColor="#999"
          secureTextEntry
          style={inputStyle}
        />{" "}
        <TextInput
          value={age}
          onChangeText={setAge}
          placeholder={t("AGE")}
          placeholderTextColor="#999"
          keyboardType="numeric"
          style={inputStyle}
        />{" "}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {" "}
          <TouchableOpacity
            onPress={() => setGender("F")}
            style={{
              flex: 1,
              backgroundColor: gender === "F" ? "#111827" : "#e5e7eb",
              padding: 12,
              borderRadius: 10,
            }}
          >
            {" "}
            <Text
              style={{
                fontFamily: FONT,
                color: gender === "F" ? "#fff" : "#111",
                textAlign: "center",
              }}
            >
              {t("FEMALE")}
            </Text>{" "}
          </TouchableOpacity>{" "}
          <TouchableOpacity
            onPress={() => setGender("M")}
            style={{
              flex: 1,
              backgroundColor: gender === "M" ? "#111827" : "#e5e7eb",
              padding: 12,
              borderRadius: 10,
            }}
          >
            {" "}
            <Text
              style={{
                fontFamily: FONT,
                color: gender === "M" ? "#fff" : "#111",
                textAlign: "center",
              }}
            >
              {t("MALE")}
            </Text>{" "}
          </TouchableOpacity>{" "}
        </View>{" "}
        <TextInput
          value={weight}
          onChangeText={setWeight}
          placeholder={t("WEIGHT")}
          placeholderTextColor="#999"
          keyboardType="numeric"
          style={inputStyle}
        />{" "}
        <TextInput
          value={height}
          onChangeText={setHeight}
          placeholder={t("HEIGHT")}
          placeholderTextColor="#999"
          keyboardType="numeric"
          style={inputStyle}
        />
        {/* 버튼: 인증번호 발송 */}{" "}
        <Button
          title={loading ? t("PROCESSING") : t("SEND_VERIFICATION_CODE")}
          onPress={onSubmit}
          disabled={loading}
          bg="#10b981"
        />
        {/* 인증 섹션 */}{" "}
        {sent && (
          <View
            style={{
              marginTop: 20,
              padding: 14,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 12,
            }}
          >
            {" "}
            <Text
              style={{ fontFamily: FONT, color: "#16a34a", marginBottom: 8 }}
            >
              {t("VERIFICATION_SENT_MSG")}{" "}
            </Text>{" "}
            <Text
              style={{ fontFamily: FONT, color: "#6b7280", marginBottom: 10 }}
            >
              {" "}
              {leftSec > 0
                ? t("RESEND_WAIT", { time: mmss(leftSec) })
                : t("RESEND_HINT")}{" "}
            </Text>{" "}
            <TextInput
              value={code}
              onChangeText={(text) => setCode(onlyDigits(text))}
              placeholder={t("VERIFICATION_CODE")}
              keyboardType="number-pad"
              maxLength={6}
              style={{
                ...inputStyle,
                textAlign: "center",
                letterSpacing: 6,
                fontSize: 20,
              }}
            />
            <View style={{ height: 10 }} />{" "}
            <Button
              title={verifyLoading ? t("CONFIRMING") : t("CONFIRM")}
              onPress={verifyEmailCode}
              disabled={verifyLoading || code.length !== 6}
              bg="#2563eb"
            />{" "}
          </View>
        )}{" "}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginTop: 8,
          }}
        >
          {" "}
          <Text style={{ color: "#6b7280", fontFamily: FONT }}>
            {t("ALREADY_HAVE_ACCOUNT")}
          </Text>{" "}
          <TouchableOpacity onPress={() => navigation.replace("Login")}>
            {" "}
            <Text style={{ color: "#2563eb", fontFamily: FONT }}>
              {t("LOGIN")}
            </Text>{" "}
          </TouchableOpacity>{" "}
        </View>{" "}
      </ScrollView>{" "}
    </KeyboardAvoidingView>
  );
}
