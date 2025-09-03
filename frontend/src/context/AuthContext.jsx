import { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiPost } from "../config/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem("token");
      const u = await AsyncStorage.getItem("user");
      if (t && u) {
        setToken(t);
        setUser(JSON.parse(u));
      }
      setReady(true);
    })();
  }, []);

  const login = async (id, password) => {
    try {
      const res = await apiPost("/api/auth/login", { id, password });
      const bearer = `${res.tokenType || "Bearer"} ${res.token}`;
      await AsyncStorage.setItem("token", bearer);
      const userData = { id: res.id };
      await AsyncStorage.setItem("user", JSON.stringify(userData));
      setToken(bearer);
      setUser(userData);
      return true;
    } catch (error) {
      return false;
    }
  };

  const signup = async (form) => {
    try {
      await apiPost("/api/auth/signup", {
        id: String(form.id || "").trim(),
        password: String(form.password || ""),
        weight: Number(form.weight),
        age: Number(form.age),
        gender: String(form.gender || "F").toUpperCase(),
        height: Number(form.height),
      });
      const ok = await login(form.id, form.password);
      return ok;
    } catch (error) {
      return false;
    }
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(["token", "user"]);
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, token, ready, login, logout, signup }),
    [user, token, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
