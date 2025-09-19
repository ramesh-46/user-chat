// src/contexts/ThemeContext.js
import React, {
  createContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import { THEMES } from "../themes";

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeKey, setThemeKey] = useState("blackPearl");
  const theme = THEMES[themeKey];

  /* push css vars + derived mixes */
  const pushCssVars = useCallback(() => {
    const root = document.documentElement;
    const { palette, fonts } = theme;

    /* base palette */
    Object.entries(palette).forEach(([k, v]) =>
      root.style.setProperty(`--${k}`, v)
    );
    root.style.setProperty("--font-ui", fonts.ui);

    /* derived mixes */
    root.style.setProperty(
      "--tint-20",
      `color-mix(in srgb, var(--primarySoft) 80%, #fff)` // 20 % lighter
    );
    root.style.setProperty(
      "--shade-10",
      `color-mix(in srgb, var(--primary) 90%, #000)`      // 10 % darker
    );

    /* 20 % soft-accent panel (use in ChatList, ChatWindow, etc.) */
    root.style.setProperty(
      "--panel",
      `color-mix(in srgb, var(--primary) 20%, var(--primarySoft))`
    );
  }, [theme]);

  /* responsive base font-size */
  const setBaseFont = useCallback(() => {
    const big = window.matchMedia("(min-width: 768px)").matches;
    document.documentElement.style.fontSize = big ? "18px" : "16px";
  }, []);

  useEffect(pushCssVars, [pushCssVars]);
  useEffect(() => {
    setBaseFont();
    window.addEventListener("resize", setBaseFont);
    return () => window.removeEventListener("resize", setBaseFont);
  }, [setBaseFont]);

  const value = useMemo(
    () => ({
      themeKey,
      theme,
      setTheme: (k) => k in THEMES && setThemeKey(k),
    }),
    [themeKey, theme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
