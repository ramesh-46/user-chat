import React, { useState, useEffect } from "react";

export default function Navbar({ logout, onProfile, onGroups, onSettings, onSearchToggle }) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(window.innerWidth <= 768);
  useEffect(() => { const resize = () => setMobile(window.innerWidth <= 768); window.addEventListener("resize", resize); return () => window.removeEventListener("resize", resize); }, []);
  const action = (callback) => { setOpen(false); callback?.(); };
  return (
    <header style={{ ...S.bar, ...(mobile ? S.mobileBar : S.desktopBar) }}>
      <div style={S.brand}><span style={S.mark}>S</span>{!mobile && <strong>SURA</strong>}</div>
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
  bar: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FFFFFF", color: "var(--textMain)", boxSizing: "border-box", borderRight: "1px solid var(--border)", zIndex: 3000 },
  desktopBar: { position: "fixed", inset: "0 auto 0 0", width: 72, height: "100dvh", flexDirection: "column", justifyContent: "flex-start", gap: 22, padding: "18px 10px", boxShadow: "2px 0 14px rgba(30,25,70,.035)" },
  mobileBar: { position: "fixed", inset: "0 0 auto 0", width: "100%", height: 58, flexDirection: "row", padding: "0 14px", borderBottom: "1px solid var(--border)", boxShadow: "0 2px 12px rgba(30,25,70,.04)" },
  brand: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: ".5px", fontSize: 11, color: "var(--primary)" },
  mark: { width: 40, height: 40, borderRadius: 14, display: "grid", placeItems: "center", background: "var(--primary)", color: "#fff", fontWeight: 800, fontSize: 18, boxShadow: "0 6px 16px rgba(128,101,245,.24)" },
  menuButton: { width: 42, height: 42, border: 0, borderRadius: 13, background: "var(--primarySoft)", color: "var(--primary)", fontSize: 25, cursor: "pointer" },
  menu: { position: "absolute", top: 48, right: 0, zIndex: 4000, width: 240, padding: 8, borderRadius: 16, background: "#FFFFFF", opacity: 1, color: "#17212B", border: "1px solid #E5E7EB", boxShadow: "0 18px 48px rgba(15,23,42,.22)" },
  item: { display: "block", width: "100%", padding: "12px 13px", textAlign: "left", border: 0, borderRadius: 10, background: "#FFFFFF", color: "#17212B", cursor: "pointer", opacity: 1, fontWeight: 600 },
  searchButton: { width: 42, height: 42, border: 0, borderRadius: 13, background: "var(--primarySoft)", color: "var(--primary)", fontSize: 25, cursor: "pointer" },
};
