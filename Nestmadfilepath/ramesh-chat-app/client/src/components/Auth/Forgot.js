import React, { useState, useContext } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { recoverUsername, recoverEmail, recoverByQuestion } from "../../api";

const MODES = [
  { key: "uname", title: "Find my username", hint: "Enter your email address", field: "email" },
  { key: "email", title: "Find my email", hint: "Enter your username", field: "username" },
  { key: "recovery", title: "Recover password", hint: "Enter your email, then answer your security question", field: "email" },
];

export default function Forgot() {
  const [mode, setMode] = useState("uname");
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState("");
  const [step, setStep] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const active = MODES.find((m) => m.key === mode) || MODES[0];

  const reset = (key) => {
    setMode(key); setInput(""); setAnswer(""); setResult(null); setError(""); setStep(1);
  };

  const go = async () => {
    if (!input.trim()) return setError("Enter a value first.");
    setBusy(true); setError(""); setResult(null);
    try {
      if (mode === "recovery") {
        if (step === 1) { setStep(2); }
        else {
          const res = await recoverByQuestion(input.trim(), answer.trim());
          setResult(res.data);
        }
      } else {
        const res = mode === "uname" ? await recoverUsername(input) : await recoverEmail(input);
        setResult(res.data);
      }
    } catch (e) {
      setResult(null);
      setError(e?.response?.data?.error || "Not found. Please check your input.");
    } finally { setBusy(false); }
  };

  const renderResult = () => {
    if (error) return <div style={styles.errorBox}><strong>⚠ Error:</strong> {error}</div>;
    if (!result) return null;
    const key = Object.keys(result)[0];
    let value = result[key];
    if (key === "password") value = `🔐 ${value}`;
    return (
      <div style={styles.resultBox}>
        <span style={styles.resultLabel}>Recovered {key.charAt(0).toUpperCase() + key.slice(1)}</span>
        <div style={styles.resultValue}>{value}</div>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.logoMark}>?</div>
        <h2 style={styles.h2}>ACCOUNT RECOVERY</h2>
        <p style={styles.subtitle}>Get back into your Sura Chat account safely.</p>

        <div style={styles.modeRow}>
          {MODES.map((m) => (
            <button key={m.key} type="button" style={{ ...styles.modeBtn, ...(mode === m.key ? styles.modeBtnActive : {}) }} onClick={() => reset(m.key)}>
              {m.title}
            </button>
          ))}
        </div>

        <label style={styles.label}>{active.hint.toUpperCase()}</label>
        <input style={styles.input} placeholder={active.field === "email" ? "you@gmail.com" : "your username"}
          value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()} autoCapitalize="none" />

        {mode === "recovery" && step === 2 && (
          <>
            <label style={styles.label}>SECURITY QUESTION</label>
            <input style={styles.input} placeholder="Who was your favorite teacher?"
              value={answer} onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && go()} />
          </>
        )}

        <button style={styles.btn} onClick={go} disabled={busy}>
          {busy ? "CHECKING…" : mode === "recovery" && step === 2 ? "SUBMIT ANSWER" : step === 1 && mode === "recovery" ? "CONTINUE" : "RECOVER"}
        </button>

        {renderResult()}

        <p style={styles.footer}><Link style={styles.link} to="/login">← BACK TO LOGIN</Link></p>
      </div>
    </motion.div>
  );
}

const styles = {
  wrap: {
    minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", padding: 16,
    background: "radial-gradient(circle at top, #25344b 0%, #111827 45%, #080d16 100%)",
    fontFamily: "var(--font-ui)", color: "#f7f8fb", boxSizing: "border-box",
  },
  card: {
    width: "100%", maxWidth: 440, padding: "36px 32px", borderRadius: 24,
    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.13)",
    backdropFilter: "blur(18px)", boxShadow: "0 24px 70px rgba(0,0,0,.42)",
    display: "flex", flexDirection: "column", boxSizing: "border-box",
  },
  logoMark: {
    width: 54, height: 54, borderRadius: 17, display: "grid", placeItems: "center", alignSelf: "center",
    background: "linear-gradient(135deg,#8fd7bd,#3d9b78)", color: "#0c1712", fontWeight: 900, fontSize: 24,
    boxShadow: "0 8px 28px rgba(61,155,120,.3)",
  },
  h2: { textAlign: "center", fontSize: "clamp(1.3rem,5vw,1.7rem)", letterSpacing: 1.4, margin: "16px 0 6px" },
  subtitle: { textAlign: "center", color: "#aab5c5", fontSize: 12.5, lineHeight: 1.6, margin: "0 0 20px" },
  modeRow: { display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" },
  modeBtn: {
    flex: 1, minWidth: 100, border: "1px solid rgba(255,255,255,.13)", borderRadius: 11, padding: "10px 8px",
    background: "rgba(7,13,24,.5)", color: "#c4ccd8", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
  },
  modeBtnActive: { background: "#3d9b78", borderColor: "#3d9b78", color: "#fff" },
  label: { color: "#c4ccd8", fontSize: 10, letterSpacing: 1.2, fontWeight: 700, marginBottom: 8 },
  input: {
    width: "100%", boxSizing: "border-box", padding: "14px 15px", marginBottom: 14,
    border: "1px solid rgba(255,255,255,.13)", borderRadius: 12, background: "rgba(7,13,24,.58)",
    color: "#fff", fontSize: 14, outline: "none",
  },
  btn: {
    width: "100%", padding: "15px 18px", marginTop: 4, border: "none", borderRadius: 12,
    fontWeight: 800, fontSize: 13, letterSpacing: 1,
    background: "linear-gradient(135deg,#8fd7bd,#3d9b78)", color: "#0c1712", cursor: "pointer",
  },
  resultBox: {
    marginTop: 20, width: "100%", boxSizing: "border-box", background: "rgba(61,155,120,.1)",
    padding: "16px 18px", borderRadius: 14, border: "1px solid rgba(61,155,120,.4)",
  },
  resultLabel: { fontSize: 11, fontWeight: 800, letterSpacing: 1.2, display: "block", marginBottom: 6, color: "#8fd7bd" },
  resultValue: { fontSize: 15, fontWeight: 700, wordBreak: "break-all", color: "#d9ffee" },
  errorBox: {
    marginTop: 20, width: "100%", boxSizing: "border-box", background: "rgba(226,72,72,.1)",
    padding: "16px 18px", borderRadius: 14, border: "1px solid rgba(226,72,72,.4)", color: "#ff9c9c",
    fontWeight: 600, fontSize: 13, lineHeight: 1.5,
  },
  footer: { textAlign: "center", margin: "20px 0 0", fontSize: 11.5 },
  link: { color: "#e2c187", textDecoration: "none", fontWeight: 700 },
};
