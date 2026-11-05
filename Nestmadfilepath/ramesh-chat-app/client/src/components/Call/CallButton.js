import React, { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { useCall } from "../hooks/useCall";

const displayName = (incoming, peer) =>
  incoming?.username || incoming?.name || peer?.contactName || peer?.name || peer?.username || "Sura Chat user";

const initials = (name) => String(name || "SC").trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");

export default function CallButton({ peer }) {
  const { user } = useContext(AuthContext);
  const {
    call, hangup, answer, decline, toggleMute, toggleCamera, switchCamera, switchMediaMode, getNetworkStats, switchMediaMode, getNetworkStats,
    requestRecording, acceptRecording, stopRecording, pauseRecording,
    callState, incomingPeer, mediaMode, isMuted, cameraEnabled, recording,
    recordingRequest, recordingPaused, recordingSaved, getLocalStream, getRemoteStream, localVersion, remoteVersion,
  } = useCall(user?._id || user?.userId);
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const remoteAudio = useRef(null);
  const [elapsed, setElapsed] = useState(0);
  const [network, setNetwork] = useState({ mbps: 0, rtt: null });
  const previousBytes = useRef({ value: 0, at: 0 });
  const [network, setNetwork] = useState({ mbps: 0, rtt: null });
  const previousBytes = useRef({ value: 0, at: 0 });

  useEffect(() => {
    if (localVideo.current) localVideo.current.srcObject = getLocalStream() || null;
  }, [getLocalStream, localVersion, callState]);
  useEffect(() => {
    const stream = getRemoteStream();
    if (remoteVideo.current) remoteVideo.current.srcObject = stream || null;
    if (remoteAudio.current) remoteAudio.current.srcObject = mediaMode === "audio" ? (stream || null) : null;
  }, [getRemoteStream, remoteVersion, callState, mediaMode]);
  useEffect(() => {
    if (callState !== "connected") { setElapsed(0); setNetwork({ mbps: 0, rtt: null }); previousBytes.current = { value: 0, at: 0 }; return undefined; }
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [callState]);
  useEffect(() => {
    if (callState !== "connected") return undefined;
    const timer = setInterval(async () => {
      const stats = await getNetworkStats(); if (!stats) return;
      const now = Date.now(); const prev = previousBytes.current;
      const mbps = prev.at ? Math.max(0, ((stats.bytesReceived - prev.value) * 8) / ((now - prev.at) * 1000)) : 0;
      previousBytes.current = { value: stats.bytesReceived, at: now }; setNetwork({ mbps, rtt: stats.rtt });
    }, 2000);
    return () => clearInterval(timer);
  }, [callState, getNetworkStats]);
  useEffect(() => () => {
    [localVideo.current, remoteVideo.current, remoteAudio.current].forEach((element) => {
      if (element) element.srcObject = null;
    });
  }, []);

  const name = displayName(incomingPeer, peer);
  const avatar = incomingPeer?.avatar?.url || (typeof incomingPeer?.avatar === "string" ? incomingPeer.avatar : "") || peer?.profileImage || peer?.profilePic || peer?.avatar?.url;
  const time = `${Math.floor(elapsed / 60).toString().padStart(2, "0")}:${(elapsed % 60).toString().padStart(2, "0")}`;
  const start = (mode) => call(peer?._id || peer?.userId, peer, mode);
  const active = callState !== "idle";
  const status = callState === "incoming" ? `Incoming ${mediaMode} call`
    : callState === "calling" ? "Calling…"
    : callState === "connected" ? time : "Call ended";

  return (
    <>
      <div style={styles.launcher}>
        {!active && peer && <>
          <button type="button" title="Voice call" aria-label="Start voice call" onClick={() => start("audio")} style={styles.launchButton}>☎</button>
          <button type="button" title="Video call" aria-label="Start video call" onClick={() => start("video")} style={styles.launchButton}>▣</button>
        </>}
      </div>
      <audio ref={remoteAudio} autoPlay playsInline style={{ display: "none" }} />
      {recordingSaved && <div role="status" style={styles.savedToast}>✓ Recording saved to Downloads</div>}
      {active && <div style={styles.backdrop}>
        <section style={{ ...styles.panel, ...(mediaMode === "video" ? styles.videoPanel : styles.audioPanel) }} aria-label={`${mediaMode} call`}>
          <header style={styles.topBar}>
            <div style={styles.secureMark}>● <span> SURA CALL</span></div>
            <div style={styles.callStatus}><span style={styles.statusDot} />{status}{callState === "connected" && <small style={{ marginLeft: 8, opacity: .75 }}>{network.mbps.toFixed(2)} Mbps{network.rtt != null ? " · " + network.rtt + " ms" : ""}</small>}</div>
            <button type="button" aria-label="End call" title="End call" onClick={hangup} style={styles.topClose}>×</button>
          </header>

          {mediaMode === "video" ? (
            <div style={styles.videoStage}>
              <video ref={remoteVideo} autoPlay playsInline style={styles.remoteVideo} />
              {callState !== "connected" && <div style={styles.videoWaiting}>
                <div style={styles.avatarLarge}>{avatar ? <img src={avatar} alt="" style={styles.avatarImage} /> : initials(name)}</div>
                <strong>{name}</strong><span>{callState === "incoming" ? "Wants to video call you" : "Connecting video…"}</span>
              </div>}
              <div style={styles.videoName}><strong>{name}</strong><span>{callState === "connected" ? "Connected" : "Waiting for participant"}</span></div>
              <div style={styles.localPreview}>
                <video ref={localVideo} autoPlay playsInline muted style={styles.localVideo} />
                {!cameraEnabled && <div style={styles.cameraOff}>Camera off</div>}
                <span style={styles.youLabel}>You</span>
              </div>
            </div>
          ) : (
            <div style={styles.audioStage}>
              <div style={styles.audioGlow} />
              <div style={styles.avatarLarge}>{avatar ? <img src={avatar} alt="" style={styles.avatarImage} /> : initials(name)}</div>
              <h2 style={styles.personName}>{name}</h2>
              <p style={styles.callSub}>{callState === "incoming" ? "Incoming voice call" : callState === "calling" ? "Ringing…" : callState === "connected" ? "Voice call in progress" : "Call ended"}</p>
              <div style={styles.audioWave}>{[12, 22, 30, 18, 27, 15, 24].map((height, index) => <i key={index} style={{ ...styles.waveBar, height }} />)}</div>
            </div>
          )}

          {recording && <div style={styles.recordingPill}>● Recording this call</div>}
          {recordingRequest && <div style={styles.consent}>
            <p>The other participant requests permission to record this call. Do you consent?</p>
            <button type="button" onClick={() => acceptRecording(true)} style={styles.accept}>Allow</button>
            <button type="button" onClick={() => acceptRecording(false)} style={styles.neutral}>Decline</button>
          </div>}

          <footer style={styles.bottomArea}>
            {callState === "incoming" ? (
              <div style={styles.incomingActions}>
                <div style={styles.actionWithLabel}><button type="button" onClick={decline} style={styles.endButton}>☎</button><span>Decline</span></div>
                <div style={styles.actionWithLabel}><button type="button" onClick={answer} style={styles.answerButton}>☎</button><span>Accept</span></div>
              </div>
            ) : callState === "calling" ? (
              <div style={styles.singleAction}><button type="button" onClick={hangup} style={styles.endButton}>☎</button><span>Cancel call</span></div>
            ) : callState === "connected" ? (
              <div style={styles.controlGrid}>
                <Control label={isMuted ? "Unmute" : "Mute"} icon={isMuted ? "◌" : "♩"} active={isMuted} onClick={toggleMute} />
                <Control label={mediaMode === "video" ? "Switch to audio" : "Switch to video"} icon={mediaMode === "video" ? "☎" : "▣"} onClick={switchMediaMode} />
                <Control label={mediaMode === "video" ? "Switch to audio" : "Switch to video"} icon={mediaMode === "video" ? "☎" : "▣"} onClick={switchMediaMode} />
                {mediaMode === "video" && <>
                  <Control label={cameraEnabled ? "Camera off" : "Camera on"} icon="▣" active={!cameraEnabled} onClick={toggleCamera} />
                  <Control label="Flip camera" icon="↻" onClick={switchCamera} />
                </>}
                {!recording && <Control label="Request record" icon="●" onClick={requestRecording} />}
                {recording && <>
                  <Control label={recordingPaused ? "Resume" : "Pause"} icon={recordingPaused ? "▶" : "Ⅱ"} onClick={pauseRecording} />
                  <Control label="Save recording" icon="↓" onClick={stopRecording} />
                </>}
                <div style={styles.actionWithLabel}><button type="button" onClick={hangup} style={styles.endButton}>☎</button><span>End</span></div>
              </div>
            ) : null}
            <p style={styles.privacyNote}>Your microphone and camera are used only during this call. Recording requires the other participant’s consent.</p>
          </footer>
        </section>
      </div>}
    </>
  );
}

function Control({ label, icon, active, onClick }) {
  return <div style={styles.actionWithLabel}>
    <button type="button" aria-label={label} title={label} onClick={onClick} style={{ ...styles.controlButton, ...(active ? styles.controlActive : {}) }}>{icon}</button>
    <span>{label}</span>
  </div>;
}

const styles = {
  launcher: { position: "fixed", right: 16, top: 68, zIndex: 1200, display: "flex", gap: 9 },
  launchButton: { width: 42, height: 42, border: "1px solid var(--border)", borderRadius: 14, cursor: "pointer", background: "var(--surface)", color: "var(--primary)", fontSize: 18, boxShadow: "0 5px 18px rgba(0,0,0,.08)" },
  backdrop: { position: "fixed", inset: 0, zIndex: 10000, background: "#070b14", display: "grid", placeItems: "center", padding: 0 },
  panel: { position: "relative", width: "100%", height: "100dvh", maxHeight: "100dvh", overflow: "hidden", boxSizing: "border-box", color: "#fff", display: "flex", flexDirection: "column", fontFamily: "var(--font-ui, Inter, sans-serif)", isolation: "isolate" },
  audioPanel: { background: "radial-gradient(ellipse at 50% 34%, #243b59 0%, #101b2c 42%, #080d17 100%)" },
  videoPanel: { background: "#05080f" },
  topBar: { height: 66, minHeight: 66, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "max(8px, env(safe-area-inset-top)) clamp(16px, 4vw, 34px) 8px", boxSizing: "border-box", borderBottom: "1px solid rgba(255,255,255,.08)", background: "rgba(4,8,15,.38)", zIndex: 3 },
  secureMark: { fontSize: 10, letterSpacing: 2, color: "#83d7bd", fontWeight: 800 },
  callStatus: { display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,.78)", fontSize: 13, fontVariantNumeric: "tabular-nums" },
  statusDot: { width: 7, height: 7, borderRadius: "50%", background: "#53d69a", boxShadow: "0 0 12px #53d69a" },
  topClose: { width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.08)", color: "#fff", fontSize: 25, cursor: "pointer", lineHeight: 1 },
  audioStage: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", padding: "24px 20px", overflow: "hidden" },
  audioGlow: { position: "absolute", width: "min(72vw, 420px)", aspectRatio: "1", borderRadius: "50%", background: "radial-gradient(circle, rgba(91,153,208,.18), transparent 68%)", filter: "blur(8px)" },
  avatarLarge: { width: "clamp(112px, 24vw, 166px)", height: "clamp(112px, 24vw, 166px)", borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(145deg,#6e8eae,#344c6a)", border: "4px solid rgba(255,255,255,.17)", boxShadow: "0 18px 60px rgba(0,0,0,.35)", fontSize: 42, fontWeight: 700, position: "relative", zIndex: 1, overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%", objectFit: "cover" },
  personName: { fontSize: "clamp(23px, 4vw, 32px)", fontWeight: 650, margin: "24px 0 5px", textAlign: "center", zIndex: 1 },
  callSub: { margin: 0, color: "rgba(255,255,255,.65)", fontSize: 14, zIndex: 1 },
  audioWave: { display: "flex", alignItems: "center", gap: 5, height: 34, marginTop: 34, opacity: .8 },
  waveBar: { display: "block", width: 4, borderRadius: 4, background: "linear-gradient(180deg,#9edacb,#5b8db6)" },
  videoStage: { position: "relative", flex: 1, minHeight: 0, width: "100%", overflow: "hidden", background: "radial-gradient(ellipse at center,#17243a,#05080f 70%)" },
  remoteVideo: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", background: "#05080f" },
  videoWaiting: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "rgba(5,8,15,.72)", zIndex: 1 },
  videoName: { position: "absolute", left: 20, top: 18, display: "flex", flexDirection: "column", gap: 3, padding: "10px 14px", borderRadius: 14, background: "rgba(7,12,21,.45)", backdropFilter: "blur(16px)", zIndex: 2, fontSize: 13 },
  localPreview: { position: "absolute", right: "clamp(12px, 3vw, 28px)", top: "clamp(12px, 3vw, 28px)", width: "clamp(100px, 20vw, 190px)", height: "clamp(136px, 28vh, 230px)", borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,.38)", boxShadow: "0 12px 32px rgba(0,0,0,.38)", background: "#172235", zIndex: 2 },
  localVideo: { width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" },
  cameraOff: { position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "#1a2638", fontSize: 12 },
  youLabel: { position: "absolute", bottom: 8, left: 9, fontSize: 11, padding: "4px 8px", borderRadius: 8, background: "rgba(0,0,0,.45)" },
  bottomArea: { flexShrink: 0, padding: "18px clamp(12px, 4vw, 32px) max(18px, env(safe-area-inset-bottom))", background: "linear-gradient(180deg,rgba(8,13,23,.75),rgba(8,13,23,.98))", borderTop: "1px solid rgba(255,255,255,.08)", zIndex: 3 },
  controlGrid: { display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: "14px clamp(14px, 3vw, 30px)", maxWidth: 680, margin: "0 auto" },
  actionWithLabel: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 58, color: "rgba(255,255,255,.78)", fontSize: 11 },
  controlButton: { width: 54, height: 54, borderRadius: "50%", border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.12)", color: "#fff", fontSize: 20, cursor: "pointer", backdropFilter: "blur(14px)" },
  controlActive: { background: "#e4a44d", color: "#172033", borderColor: "#e4a44d" },
  endButton: { width: 58, height: 58, border: 0, borderRadius: "50%", background: "#ed555b", color: "#fff", fontSize: 24, transform: "rotate(135deg)", cursor: "pointer", boxShadow: "0 8px 24px rgba(237,85,91,.3)" },
  answerButton: { width: 58, height: 58, border: 0, borderRadius: "50%", background: "#28b879", color: "#fff", fontSize: 24, cursor: "pointer", boxShadow: "0 8px 24px rgba(40,184,121,.3)" },
  incomingActions: { display: "flex", justifyContent: "center", gap: "clamp(54px, 18vw, 120px)" },
  singleAction: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "rgba(255,255,255,.8)", fontSize: 12 },
  privacyNote: { margin: "18px auto 0", maxWidth: 600, textAlign: "center", color: "rgba(255,255,255,.42)", fontSize: 10, lineHeight: 1.5 },
  recordingPill: { position: "absolute", top: 78, left: "50%", transform: "translateX(-50%)", zIndex: 5, background: "rgba(210,55,62,.88)", padding: "7px 12px", borderRadius: 999, fontSize: 11 },
  consent: { position: "absolute", zIndex: 6, left: 16, right: 16, top: "42%", maxWidth: 420, margin: "0 auto", padding: 18, borderRadius: 18, background: "#1d2b40", border: "1px solid rgba(255,255,255,.16)", textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,.4)" },
  accept: { border: 0, borderRadius: 999, padding: "10px 18px", margin: 5, background: "#28b879", color: "#fff", cursor: "pointer" },
  neutral: { border: "1px solid rgba(255,255,255,.2)", borderRadius: 999, padding: "10px 18px", margin: 5, background: "rgba(255,255,255,.08)", color: "#fff", cursor: "pointer" },
  savedToast: { position: "fixed", top: 18, left: "50%", transform: "translateX(-50%)", zIndex: 11000, padding: "11px 16px", borderRadius: 12, background: "#146c43", color: "#fff", fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,.35)", whiteSpace: "nowrap" },
};
