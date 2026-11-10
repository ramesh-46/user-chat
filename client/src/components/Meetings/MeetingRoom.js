import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { joinMeeting } from "../../api";

export default function MeetingRoom() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [passcode, setPasscode] = useState(location.state?.passcode || "");
  const [meeting, setMeeting] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const container = useRef(null);
  const jitsi = useRef(null);

  const enter = async (event) => {
    event?.preventDefault();
    setBusy(true); setError("");
    try {
      const response = await joinMeeting(roomId, passcode);
      setMeeting(response.data.meeting);
    } catch (e) {
      setError(e.response?.data?.error || "Unable to join this meeting.");
    } finally { setBusy(false); }
  };

  useEffect(() => {
    if (!meeting) return undefined;
    if (window.JitsiMeetExternalAPI) { setApiReady(true); return undefined; }
    const existing = document.querySelector('script[data-jitsi-api="true"]');
    if (existing) {
      existing.addEventListener("load", () => setApiReady(true), { once: true });
      if (window.JitsiMeetExternalAPI) setApiReady(true);
      return undefined;
    }
    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.dataset.jitsiApi = "true";
    script.onload = () => setApiReady(true);
    script.onerror = () => setError("The meeting service could not load. Check your internet connection.");
    document.body.appendChild(script);
    return undefined;
  }, [meeting]);

  useEffect(() => {
    if (!meeting || !apiReady || !container.current || !window.JitsiMeetExternalAPI) return undefined;
    const api = new window.JitsiMeetExternalAPI("meet.jit.si", {
      roomName: meeting.roomId,
      parentNode: container.current,
      width: "100%",
      height: "100%",
      userInfo: { displayName: "Sura Chat participant" },
      configOverwrite: { prejoinPageEnabled: false, disableDeepLinking: true, startWithAudioMuted: false, startWithVideoMuted: false },
      interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: false, SHOW_WATERMARK_FOR_GUESTS: false, MOBILE_APP_PROMO: false, TOOLBAR_BUTTONS: ["microphone", "camera", "desktop", "chat", "raisehand", "tileview", "participants-pane", "settings", "hangup"] }
    });
    jitsi.current = api;
    api.addEventListener("videoConferenceJoined", () => {
      if (meeting.isHost && passcode) {
        try { api.executeCommand("password", passcode); } catch (_) {}
      }
    });
    api.addEventListener("passwordRequired", () => {
      if (passcode) {
        try { api.executeCommand("password", passcode); } catch (_) {}
      }
    });
    api.addEventListener("readyToClose", () => navigate("/", { replace: true }));
    return () => { try { api.dispose(); } catch (_) {} jitsi.current = null; };
  }, [meeting, apiReady, navigate, passcode]);

  if (meeting) return <div style={styles.room}>
    <header style={styles.roomHeader}><strong>{meeting.title}</strong><button onClick={() => { jitsi.current?.executeCommand("hangup"); navigate("/", { replace: true }); }} style={styles.leave}>Leave meeting</button></header>
    <div ref={container} style={styles.frame} />
    {error && <div style={styles.errorToast}>{error}</div>}
  </div>;

  return <main style={styles.gate}>
    <form onSubmit={enter} style={styles.card}>
      <div style={styles.logo}>▣</div><h2 style={{ margin: "8px 0" }}>Join meeting</h2>
      <p style={styles.muted}>Enter the meeting code shared by the host.</p>
      <input autoFocus value={passcode} onChange={e => setPasscode(e.target.value)} placeholder="Meeting code (if required)" style={styles.input} />
      {error && <p style={styles.error}>{error}</p>}
      <button disabled={busy} style={styles.join}>{busy ? "Checking…" : "Continue to meeting"}</button>
      <button type="button" onClick={() => navigate("/")} style={styles.cancel}>Back to chats</button>
    </form>
  </main>;
}

const styles = {
  room: { position: "fixed", inset: 0, zIndex: 40000, display: "flex", flexDirection: "column", background: "#090d16", color: "#fff", fontFamily: "var(--font-ui)" },
  roomHeader: { height: 52, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", borderBottom: "1px solid rgba(255,255,255,.12)" },
  leave: { border: 0, borderRadius: 9, padding: "8px 13px", background: "#e64d5b", color: "#fff", cursor: "pointer" },
  frame: { flex: 1, minHeight: 0, width: "100%" },
  gate: { minHeight: "100dvh", display: "grid", placeItems: "center", padding: 18, background: "var(--primarySoft)", color: "var(--textMain)", fontFamily: "var(--font-ui)" },
  card: { width: "min(390px, 100%)", padding: 26, borderRadius: 20, background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 16px 55px rgba(30,20,60,.12)" },
  logo: { width: 48, height: 48, display: "grid", placeItems: "center", borderRadius: 15, background: "var(--primary)", color: "#fff", fontSize: 23 },
  muted: { color: "var(--textLight)", fontSize: 13, lineHeight: 1.6, marginBottom: 18 },
  input: { width: "100%", boxSizing: "border-box", border: "1px solid var(--border)", borderRadius: 11, padding: 12, background: "var(--surface)", color: "var(--textMain)" },
  join: { width: "100%", marginTop: 12, border: 0, borderRadius: 11, padding: 13, background: "var(--primary)", color: "#fff", fontWeight: 700, cursor: "pointer" },
  cancel: { width: "100%", marginTop: 8, border: "1px solid var(--border)", borderRadius: 11, padding: 12, background: "var(--surface)", color: "var(--textMain)", cursor: "pointer" },
  error: { color: "#d94354", fontSize: 12 },
  errorToast: { position: "absolute", bottom: 18, left: 18, right: 18, padding: 12, background: "#812f39", borderRadius: 10 }
};
