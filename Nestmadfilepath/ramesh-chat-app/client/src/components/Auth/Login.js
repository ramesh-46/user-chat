import React, { useState, useContext, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithCustomToken,
} from "firebase/auth";

import { auth } from "../../firebase";
import api, { login as apiLogin, recoverEmail } from "../../api";
import { AuthContext } from "../../contexts/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [qrSession, setQrSession] = useState(null);
  const [qrBusy, setQrBusy] = useState(false);
  const qrRef = useRef(null);
  const loginRef = useRef(login);
  loginRef.current = login;
  const { login } = useContext(AuthContext);
  const nav = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) return setError("Enter your username and password.");
    try {
      setLoading(true); setError("");
      const email = (await recoverEmail(username.trim())).data.email;
      await signInWithEmailAndPassword(auth, email, password);
      const res = await apiLogin({ username: username.trim().toLowerCase(), password });
      login(res.data);
      nav("/");
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true); setError("");
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(auth, provider);
      const idToken = await credential.user.getIdToken();
      const res = await api.post("/auth/google", { idToken });
      login(res.data);
      nav("/");
    } catch (err) {
      const code = err?.code;
      setError(
        code === "auth/popup-closed-by-user" ? "Google sign-in was cancelled."
        : code === "auth/unauthorized-domain" ? "This website domain is not authorized in your Firebase project."
        : err?.response?.data?.error || err.message || "Google login failed"
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const busy = loading || googleLoading || qrBusy;

  const startQr = async () => {
    try {
      setQrBusy(true); setError("");
      const r = await api.post("/auth-extra/qr/start", { deviceName: /Mobi/i.test(navigator.userAgent) ? "Mobile device" : "Desktop browser", userAgent: navigator.userAgent });
      setQrSession(r.data);
    } catch (e) { setError(e.response?.data?.error || "Unable to create QR login."); }
    finally { setQrBusy(false); }
  };
  useEffect(() => {
    if (!qrSession) return undefined;
    let active = true;
    if (qrRef.current && window.QRCode) {
      qrRef.current.innerHTML = "";
      new window.QRCode(qrRef.current, { text: qrSession.approvalUrl, width: 196, height: 196 });
    }
    const poll = async () => {
      try {
        const r = await api.get("/auth-extra/qr/status", { params: { sessionId: qrSession.sessionId, secret: qrSession.secret } });
        if (!active || r.data.status !== "approved" || !r.data.customToken) return;
        clearInterval(timer);
        const credential = await signInWithCustomToken(auth, r.data.customToken);
        const idToken = await credential.user.getIdToken();
        const done = await api.post("/auth-extra/qr/complete", { sessionId: qrSession.sessionId, idToken, deviceName: /Mobi/i.test(navigator.userAgent) ? "Mobile device" : "Desktop browser", userAgent: navigator.userAgent });
        if (!active) return;
        localStorage.setItem("deviceSession", done.data.sessionToken);
        loginRef.current(done.data.user); nav("/");
      } catch (e) {
        if (active && e.response?.status === 410) { setError("QR login expired. Generate a new code."); setQrSession(null); }
      }
    };
    const timer = setInterval(poll, 1800);
    return () => { active = false; clearInterval(timer); };
  }, [qrSession, nav]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.4 }}
      style={styles.wrap}
    >
      <div style={styles.card}>
        {/* Header Section matching "Hello Again!" vibe */}
        <div style={styles.header}>
          <div style={styles.brand}><span style={styles.brandMark}>✦</span><span>BLACK PEARL</span></div>
          <h2 style={styles.h2}>Welcome back.</h2>
          <p style={styles.subtitle}>Your conversations, your people, your space. Sign in to continue.</p>
        </div>

        {/* Error Message */}
        {error && <div style={styles.error}>{error}</div>}

        {/* Input Fields - Clean White Style */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Username</label>
          <div style={styles.fieldWrap}>
            <span style={styles.fieldIcon}>👤</span>
            <input 
              style={styles.input} 
              placeholder="Enter your username" 
              autoComplete="username"
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              disabled={busy} 
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Password</label>
          <div style={styles.fieldWrap}>
            <span style={styles.fieldIcon}>🔒</span>
            <input 
              style={styles.input} 
              type={showPassword ? "text" : "password"} 
              placeholder="Enter your password"
              autoComplete="current-password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()} 
              disabled={busy} 
            />
            <button 
              type="button" 
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)} 
              style={styles.eye}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
          
          {/* Remember Me & Forgot Password Row */}
          <div style={styles.optionsRow}>
            <label style={styles.rememberMe}>
              <input type="checkbox" style={styles.checkbox} />
              <span style={styles.checkLabel}>Remember me</span>
            </label>
            <Link style={styles.forgotLink} to="/forgot">Forgot Password?</Link>
          </div>
        </div>

        {/* Main Login Button */}
        <button style={styles.btn} onClick={handleLogin} disabled={busy}>
          {loading ? "Signing In..." : "Login"}
        </button>

        <button type="button" style={styles.qrButton} onClick={startQr} disabled={busy}>
          {qrBusy ? "Preparing secure QR…" : "▦  Login with QR Code"}
        </button>
        {qrSession && <div style={styles.qrPanel}>
          <b style={{color:"#f8f5eb"}}>Scan to sign in</b>
          <p style={styles.qrText}>On your signed-in device, open Settings → Login sessions & QR scan, then approve this login.</p>
          <div ref={qrRef} style={styles.qrImage} />
          <small style={styles.qrText}>Code expires in 2 minutes · Never share this code</small>
          <button type="button" style={styles.qrCancel} onClick={() => setQrSession(null)}>Cancel</button>
        </div>}
        {/* Divider */}
        <div style={styles.separator}>
          <span style={styles.sepLine}></span>
          <span style={styles.sepText}>or continue with</span>
          <span style={styles.sepLine}></span>
        </div>

        {/* Social Icons Row - Only Google as requested */}
        <div style={styles.socialRow}>
          <button 
            type="button" 
            style={styles.socialBtn} 
            onClick={handleGoogleLogin} 
            disabled={busy}
            title="Continue with Google"
          >
            {googleLoading ? (
              <div style={styles.spinner}></div>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
          </button>
        </div>

        {/* Footer / Sign Up Forward */}
        <p style={styles.footer}>
          Don't have an account? <Link style={styles.link} to="/signup">Sign up</Link>
        </p>
      </div>
    </motion.div>
  );
}

const styles = {
  wrap: {
    minHeight: "100vh", 
    display: "flex", 
    justifyContent: "center", 
    alignItems: "center",
    background: "radial-gradient(circle at 15% 15%, rgba(128,101,245,.24), transparent 32%), radial-gradient(circle at 85% 85%, rgba(212,175,55,.14), transparent 30%), #080b14",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: "28px 18px", 
    boxSizing: "border-box",
  },
  card: {
    width: "100%", 
    maxWidth: "460px",
    padding: "42px 38px", 
    borderRadius: "28px",
    background: "linear-gradient(145deg, rgba(25,31,48,.98), rgba(12,16,28,.98))",
    border: "1px solid rgba(212,175,55,.28)",
    boxShadow: "0 30px 100px rgba(0,0,0,.52), inset 0 1px 0 rgba(255,255,255,.07)",
    display: "flex", 
    flexDirection: "column", 
    boxSizing: "border-box", 
  },
  brand: { display:"flex",alignItems:"center",gap:9,marginBottom:26,color:"#d8bd70",fontSize:11,fontWeight:900,letterSpacing:"3px" },
  brandMark: { width:30,height:30,display:"grid",placeItems:"center",border:"1px solid rgba(216,189,112,.55)",borderRadius:10,fontSize:18,color:"#e8d28d" },
  header: {
    marginBottom: "30px",
    textAlign: "left",
  },
  h2: {
    fontSize: "34px",
    fontWeight: "800",
    color: "#f8f5eb",
    margin: "0 0 8px 0",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#a9afbf",
    margin: 0,
    lineHeight: "1.5",
  },
  formGroup: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "500",
    color: "#d7d2c4",
    marginBottom: "9px",
  },
  fieldWrap: {
    display: "flex", 
    alignItems: "center", 
    gap: "10px", 
    padding: "0 14px", 
    border: "1px solid rgba(255,255,255,.12)", 
    borderRadius: "14px", 
    background: "rgba(255,255,255,.055)",
    transition: "border-color 0.2s",
  },
  fieldIcon: {
    color: "#c5a85c", 
    fontSize: "16px",
  },
  input: {
    flex: 1, 
    minWidth: 0, 
    boxSizing: "border-box", 
    padding: "14px 0", 
    border: "none", 
    background: "transparent",
    color: "#f8f5eb", 
    fontSize: "14px", 
    outline: "none",
  },
  eye: { 
    border: 0, 
    background: "transparent", 
    color: "#c5a85c", 
    fontSize: "16px", 
    cursor: "pointer", 
    padding: "4px",
    display: "flex",
    alignItems: "center",
  },
  optionsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "8px",
    fontSize: "12px",
  },
  rememberMe: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
    color: "#a9afbf",
  },
  checkbox: {
    accentColor: "#111827",
    width: "14px",
    height: "14px",
  },
  checkLabel: {
    fontSize: "12px",
  },
  forgotLink: {
    color: "#d6b75f",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "12px",
  },
  error: {
    padding: "12px 14px", 
    borderRadius: "10px", 
    marginBottom: "16px", 
    fontSize: "13px", 
    lineHeight: "1.4",
    background: "rgba(220,38,38,.12)", 
    border: "1px solid rgba(248,113,113,.35)", 
    color: "#fca5a5",
    textAlign: "center",
  },
  btn: {
    width: "100%", 
    padding: "16px", 
    marginTop: "8px", 
    border: "none", 
    borderRadius: "12px",
    fontWeight: "600", 
    fontSize: "15px", 
    letterSpacing: "0.3px",
    background: "linear-gradient(110deg,#d8bd70,#b58a35)",
    color: "#17130a", 
    cursor: "pointer",
    transition: "opacity 0.2s",
  },
  qrButton: { width:"100%",padding:14,marginTop:14,borderRadius:12,border:"1px solid rgba(216,189,112,.5)",background:"rgba(216,189,112,.08)",color:"#e8d28d",fontWeight:700,cursor:"pointer" },
  qrPanel: { marginTop:14,padding:16,borderRadius:16,background:"rgba(255,255,255,.045)",border:"1px solid rgba(216,189,112,.25)",textAlign:"center" },
  qrText: { color:"#a9afbf",fontSize:12,lineHeight:1.5,margin:"10px 0" },
  qrImage: { width:212,minHeight:212,margin:"12px auto",display:"grid",placeItems:"center",background:"#fff",padding:8,borderRadius:12,boxSizing:"border-box" },
  qrCancel: { border:0,background:"transparent",color:"#d6b75f",cursor:"pointer",padding:8 },
  separator: {
    display: "flex", 
    alignItems: "center", 
    gap: "12px", 
    margin: "24px 0",
  },
  sepLine: {
    flex: 1,
    height: "1px",
    background: "rgba(255,255,255,.14)",
  },
  sepText: {
    color: "#8991a4", 
    fontSize: "11px", 
    textTransform: "lowercase",
    whiteSpace: "nowrap",
  },
  socialRow: {
    display: "flex",
    justifyContent: "center",
    gap: "16px",
    marginBottom: "24px",
  },
  socialBtn: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,.16)",
    background: "rgba(255,255,255,.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  spinner: {
    width: "16px",
    height: "16px",
    border: "2px solid #e5e7eb",
    borderTopColor: "#111827",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  footer: {
    textAlign: "center", 
    color: "#a9afbf", 
    fontSize: "13px", 
    margin: 0,
  },
  link: { 
    color: "#d6b75f", 
    textDecoration: "none", 
    fontWeight: "700",
    marginLeft: "4px",
  },
};

// Add keyframes for spinner dynamically if needed, or rely on CSS file
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = `
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    input:focus + .fieldWrap, .fieldWrap:focus-within { border-color: #111827 !important; }
    button:hover:not(:disabled) { opacity: 0.9; }
    .socialBtn:hover { background: #f9fafb; }
  `;
  document.head.appendChild(styleSheet);
}
