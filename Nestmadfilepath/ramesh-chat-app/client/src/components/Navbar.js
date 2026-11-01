import React, { useState } from "react";

export default function Navbar({ logout, onProfile, onGroups, onSettings }) {
  const [open, setOpen] = useState(false);
  const action = (callback) => { setOpen(false); callback?.(); };
  return (
    <header style={S.bar}>
      <div style={S.brand}><span style={S.mark}>BP</span><strong>BLACK PEARL CHAT</strong></div>
      <div style={{ position: "relative" }}>
        <button type="button" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} style={S.menuButton}>⋮</button>
        {open && <div style={S.menu}>
          <button style={S.item} onClick={() => action(onGroups)}>＋ Create / Open Group</button>
          <button style={S.item} onClick={() => action(onSettings)}>⚙ Settings</button>
          <button style={S.item} onClick={() => action(onProfile)}>👤 My Account</button>
          <button style={S.item} onClick={() => action(logout)}>↪ Log out</button>
        </div>}
      </div>
    </header>
  );
}
const S = {
  bar: { height: 58, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px 0 18px", background: "var(--primary)", color: "#fff", boxSizing: "border-box" },
  brand: { display: "flex", alignItems: "center", gap: 10, letterSpacing: ".5px", fontSize: "clamp(.9rem,2.5vw,1.05rem)" },
  mark: { width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center", background: "rgba(255,255,255,.18)", fontWeight: 800 },
  menuButton: { width: 40, height: 40, border: 0, borderRadius: 10, background: "rgba(255,255,255,.13)", color: "#fff", fontSize: 26, cursor: "pointer" },
  menu: { position: "absolute", top: 46, right: 0, zIndex: 4000, width: 220, padding: 6, borderRadius: 12, background: "var(--surfaceAlt)", border: "1px solid var(--border)", boxShadow: "0 12px 30px rgba(0,0,0,.25)" },
  item: { display: "block", width: "100%", padding: "11px 10px", textAlign: "left", border: 0, borderRadius: 8, background: "transparent", color: "var(--textMain)", cursor: "pointer" },
};
