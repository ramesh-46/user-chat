import React, { createContext, useState, useMemo, useCallback, useEffect } from "react";
import { THEMES } from "../themes";
import { auth } from "../firebase";
import { getThemePreferences, saveThemePreferences } from "../api";

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeKey, setThemeKeyState] = useState(() => localStorage.getItem("suraChatTheme") || "blackPearl");
  const [customColor, setCustomColorState] = useState(() => localStorage.getItem("suraChatCustomColor") || "");
  const [preferencesReady, setPreferencesReady] = useState(false);
  const theme = THEMES[themeKey] || THEMES.blackPearl;

  const pushCssVars = useCallback(() => {
    const root = document.documentElement;
    const { palette, fonts } = theme;
    Object.entries(palette).forEach(([key, value]) => root.style.setProperty("--" + key, value));
    root.style.setProperty("--font-ui", fonts.ui);
    root.style.setProperty("--primary", customColor || palette.primary);
    root.style.setProperty("--primary-rgb", customColor || palette.primary);
    root.style.setProperty("--tint-20", "color-mix(in srgb, var(--primarySoft) 80%, #fff)");
    root.style.setProperty("--shade-10", "color-mix(in srgb, var(--primary) 90%, #000)");
    root.style.setProperty("--panel", "color-mix(in srgb, var(--primary) 20%, var(--primarySoft))");
  }, [theme, customColor]);

  const setBaseFont = useCallback(() => {
    document.documentElement.style.fontSize = window.matchMedia("(min-width: 768px)").matches ? "18px" : "16px";
  }, []);

  useEffect(pushCssVars, [pushCssVars]);
  useEffect(() => {
    setBaseFont();
    window.addEventListener("resize", setBaseFont);
    return () => window.removeEventListener("resize", setBaseFont);
  }, [setBaseFont]);

  // MongoDB is the source of truth after sign-in; localStorage is only a fast first-paint cache.
  useEffect(() => {
    let active = true;
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) { if (active) setPreferencesReady(true); return; }
      try {
        const response = await getThemePreferences();
        if (!active) return;
        const saved = response.data?.preferences || {};
        const nextTheme = THEMES[saved.themeKey] ? saved.themeKey : "blackPearl";
        const nextColor = /^#[0-9A-Fa-f]{6}$/.test(saved.customColor || "") ? saved.customColor : "";
        setThemeKeyState(nextTheme);
        setCustomColorState(nextColor);
        localStorage.setItem("suraChatTheme", nextTheme);
        localStorage.setItem("suraChatCustomColor", nextColor);
      } catch (error) {
        console.warn("[THEME] Could not load saved appearance preferences:", error);
      } finally {
        if (active) setPreferencesReady(true);
      }
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  const setTheme = useCallback((key) => {
    if (!THEMES[key]) return;
    setThemeKeyState(key);
    localStorage.setItem("suraChatTheme", key);
    saveThemePreferences({ themeKey: key, customColor }).catch((error) => console.warn("[THEME] Save failed:", error));
  }, [customColor]);

  const setCustomColor = useCallback((value) => {
    const safe = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "";
    setCustomColorState(safe);
    localStorage.setItem("suraChatCustomColor", safe);
    saveThemePreferences({ themeKey, customColor: safe }).catch((error) => console.warn("[THEME] Save failed:", error));
  }, [themeKey]);

  const value = useMemo(() => ({
    themeKey, theme, setTheme, customColor, setCustomColor, preferencesReady
  }), [themeKey, theme, setTheme, customColor, setCustomColor, preferencesReady]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
