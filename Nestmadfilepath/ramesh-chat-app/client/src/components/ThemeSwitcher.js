import React, { useContext } from "react";
import { ThemeContext } from "../contexts/ThemeContext";
import { THEMES } from "../themes";

/* Simple dropdown – place it in Navbar or any header */
export default function ThemeSwitcher() {
  const { themeKey, setTheme } = useContext(ThemeContext);

  return (
    <select
      value={themeKey}
      onChange={(e) => setTheme(e.target.value)}
      style={{
        padding: "6px 10px",
        border: "1px solid var(--border)",
        background: "var(--primarySoft)",
        color: "var(--textMain)",
        borderRadius: 4,
        fontFamily: "var(--font-ui)",
        cursor: "pointer"
      }}
    >
      {Object.entries(THEMES).map(([key, { name }]) => (
        <option key={key} value={key}>
          {name}
        </option>
      ))}
    </select>
  );
}
