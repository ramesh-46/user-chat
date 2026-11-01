import React, { useState } from "react";

export default function Navbar({ logout, onProfile, onGroups, onSettings, onSearchToggle }) {
  const [open, setOpen] = useState(false);
  const action = (callback) => { setOpen(false); callback?.(); };
  return (
    <header style={S.bar}>
      <div style={S.brand}><span style={S.mark}>S</span><strong>SURA CHAT</strong></div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
        <button type="button" aria-label="Search" title="Search people" onClick={onSearchToggle} style={S.searchButton}>⌕</button>
        <button type="button" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} style={S.menuButton}>⋮</button>
        {open && <div style={S.menu}>
          <button style={S.item} onClick={() => action(onGroups)}>＋ Create group</button>
          <button style={S.item} onClick={() => action(onSettings)}>⚙ Settings</button>
          <button style={S.item} onClick={() => action(onProfile)}>👤 My Account</button>
          <button style={S.item} onClick={() => action(logout)}>↪ Log out</button>
        </div>}
      </div>
    </header>
  );
}
const S = {
  bar: { height: 58, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px 0 18px", background: "var(--primaryGradient, var(--primary))", color: "#fff", boxSizing: "border-box" },
  brand: { display: "flex", alignItems: "center", gap: 10, letterSpacing: ".5px", fontSize: "clamp(.9rem,2.5vw,1.05rem)" },
  mark: { width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center", background: "rgba(255,255,255,.18)", fontWeight: 800 },
  menuButton: { width: 40, height: 40, border: 0, borderRadius: 10, background: "rgba(255,255,255,.13)", color: "#fff", fontSize: 26, cursor: "pointer" },
  menu: { position: "absolute", top: 48, right: 0, zIndex: 4000, width: 240, padding: 8, borderRadius: 16, background: "#FFFFFF", opacity: 1, color: "#17212B", border: "1px solid #E5E7EB", boxShadow: "0 18px 48px rgba(15,23,42,.22)" },
  item: { display: "block", width: "100%", padding: "12px 13px", textAlign: "left", border: 0, borderRadius: 10, background: "#FFFFFF", color: "#17212B", cursor: "pointer", opacity: 1, fontWeight: 600 },
  searchButton: { width: 40, height: 40, border: 0, borderRadius: 12, background: "rgba(255,255,255,.16)", color: "#fff", fontSize: 25, cursor: "pointer" },
};
