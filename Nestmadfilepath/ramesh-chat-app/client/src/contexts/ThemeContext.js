import React, {
  createContext, useState, useMemo, useCallback, useEffect, useRef, useContext,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { getThemePreferences, saveThemePreferences } from "../api";
import { AuthContext } from "./AuthContext";
import { THEMES } from "../themes";

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [themeKey, setThemeKey] = useState(() => localStorage.getItem("suraChatTheme") || "blackPearl");
  const [customColor, setCustomColorState] = useState(() => localStorage.getItem("suraChatCustomColor") || "");
  const [preferencesReady, setPreferencesReady] = useState(false);
  const saveTimer = useRef(null);
  const activeUser = useRef("");

  const applyPreferences = useCallback((nextTheme, nextColor) => {
    const safeTheme = THEMES[nextTheme] ? nextTheme : "blackPearl";
    const safeColor = /^#[0-9A-Fa-f]{6}$/.test(nextColor || "") ? nextColor : "";
    setThemeKey(safeTheme);
    setCustomColorState(safeColor);
    localStorage.setItem("suraChatTheme", safeTheme);
    localStorage.setItem("suraChatCustomColor", safeColor);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const id = firebaseUser?.uid || "";
      if (!id) {
        activeUser.current = "";
        setPreferencesReady(true);
        return;
      }
      if (activeUser.current === id) return;
      activeUser.current = id;
      setPreferencesReady(false);
      try {
        const response = await getThemePreferences();
        if (!cancelled && activeUser.current === id) {
          const preferences = response.data?.preferences || {};
          applyPreferences(preferences.themeKey, preferences.customColor);
        }
      } catch (error) {
        console.warn("[THEME] Could not load cloud preferences; using this device's saved theme.", error);
      } finally {
        if (!cancelled && activeUser.current === id) setPreferencesReady(true);
      }
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [applyPreferences]);

  const persist = useCallback((nextTheme, nextColor) => {
    if (!auth.currentUser) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveThemePreferences({ themeKey: nextTheme, customColor: nextColor })
        .catch((error) => console.warn("[THEME] Cloud save failed; local preference remains active.", error));
    }, 350);
  }, []);

  const setTheme = useCallback((key) => {
    if (!THEMES[key]) return;
    setThemeKey(key);
    localStorage.setItem("suraChatTheme", key);
    persist(key, customColor);
  }, [customColor, persist]);

  const setCustomColor = useCallback((value) => {
    const safe = /^#[0-9A-Fa-f]{6}$/.test(value || "") ? value : "";
    setCustomColorState(safe);
    localStorage.setItem("suraChatCustomColor", safe);
    persist(themeKey, safe);
  }, [themeKey, persist]);

  const theme = THEMES[themeKey] || THEMES.blackPearl;
  const pushCssVars = useCallback(() => {
    const root = document.documentElement;
    Object.entries(theme.palette).forEach(([key, value]) => root.style.setProperty(`--${key}`, value));
    root.style.setProperty("--font-ui", theme.fonts.ui);
    root.style.setProperty("--primary", customColor || theme.palette.primary);
    root.style.setProperty("--tint-20", "color-mix(in srgb, var(--primarySoft) 80%, #fff)");
    root.style.setProperty("--shade-10", "color-mix(in srgb, var(--primary) 90%, #000)");
    root.style.setProperty("--panel", "color-mix(in srgb, var(--primary) 20%, var(--primarySoft))");
  }, [theme, customColor]);

  useEffect(() => { pushCssVars(); }, [pushCssVars]);
  useEffect(() => {
    const setBaseFont = () => {
      document.documentElement.style.fontSize = window.matchMedia("(min-width: 768px)").matches ? "18px" : "16px";
    };
    setBaseFont();
    window.addEventListener("resize", setBaseFont);
    return () => window.removeEventListener("resize", setBaseFont);
  }, []);
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const value = useMemo(() => ({
    themeKey, theme, setTheme, customColor, setCustomColor, preferencesReady,
  }), [themeKey, theme, setTheme, customColor, setCustomColor, preferencesReady]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
