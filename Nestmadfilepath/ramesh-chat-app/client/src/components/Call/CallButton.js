import React, { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { useCall } from "../hooks/useCall";

export default function CallButton({ peer }) {
  const { user } = useContext(AuthContext);
  const {
    call, hangup, answer, decline, toggleMute, toggleCamera, switchCamera,
    requestRecording, acceptRecording, stopRecording, pauseRecording,
    callState, incomingPeer, mediaMode, isMuted, cameraEnabled, recording,
    recordingRequest, recordingPaused, recordingSaved, getLocalStream, getRemoteStream, localVersion, remoteVersion,
  } = useCall(user?._id || user?.userId);
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const remoteAudio = useRef(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (localVideo.current) localVideo.current.srcObject = getLocalStream() || null;
  }, [getLocalStream, localVersion, callState]);
  useEffect(() => {
    const stream = getRemoteStream();
    if (remoteVideo.current) remoteVideo.current.srcObject = stream || null;
    if (remoteAudio.current) remoteAudio.current.srcObject = mediaMode === "audio" ? (stream || null) : null;
  }, [getRemoteStream, remoteVersion, callState, mediaMode]);
  useEffect(() => {
    if (callState !== "connected") { setElapsed(0); return; }
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [callState]);
  useEffect(() => () => {
    [localVideo.current, remoteVideo.current, remoteAudio.current].forEach((element) => {
      if (element) element.srcObject = null;
    });
  }, []);

  const time = `${Math.floor(elapsed / 60).toString().padStart(2, "0")}:${(elapsed % 60).toString().padStart(2, "0")}`;
  const start = (mode) => call(peer?._id || peer?.userId, peer, mode);
  const active = callState !== "idle";

  return (
    <div style={{ position: "fixed", right: 14, top: 66, zIndex: 1200, display: "inline-flex", alignItems: "center", gap: 8 }}>
      {recordingSaved && <div role="status" style={styles.savedToast}>✓ Recording saved to this device Downloads</div>}
      {!active && peer && <>
        <button type="button" title="Voice call" onClick={() => start("audio")} style={styles.icon}>☎</button>
        <button type="button" title="Video call" onClick={() => start("video")} style={styles.icon}>▣</button>
      </>}
      <audio ref={remoteAudio} autoPlay playsInline style={{ display: "none" }} />
      {active && <div style={styles.backdrop}>
        <div style={styles.panel}>
          <div style={styles.heading}>
            <strong>{incomingPeer?.username || peer?.username || peer?.name || "Call"}</strong>
            <span>{callState === "incoming" ? `Incoming ${mediaMode} call` : callState === "calling" ? "Calling…" : callState === "connected" ? time : "Call ended"}</span>
          </div>
          {mediaMode === "video" && <div style={styles.videoStage}>
            <video ref={remoteVideo} autoPlay playsInline style={styles.remoteVideo}/>
            <video ref={localVideo} autoPlay playsInline muted style={styles.localVideo}/>
          </div>}
          {mediaMode === "audio" && <div style={styles.avatar}>☎</div>}
          {recording && <p style={{ color: "#ff7777", textAlign: "center" }}>● Recording this call</p>}
          {recordingRequest && <div style={styles.consent}>
            <p>The other participant requests permission to record this call. Do you consent?</p>
            <button onClick={() => acceptRecording(true)} style={styles.accept}>Allow recording</button>
            <button onClick={() => acceptRecording(false)} style={styles.reject}>Decline</button>
          </div>}
          <div style={styles.controls}>
            {callState === "incoming" && <>
              <button onClick={answer} style={styles.accept}>Answer</button>
              <button onClick={decline} style={styles.reject}>Decline</button>
            </>}
            {callState === "calling" && <button onClick={hangup} style={styles.reject}>Cancel call</button>}
            {callState === "connected" && <>
              <button onClick={toggleMute} style={styles.control}>{isMuted ? "Unmute" : "Mute"}</button>
              {mediaMode === "video" && <>
                <button onClick={toggleCamera} style={styles.control}>{cameraEnabled ? "Camera off" : "Camera on"}</button>
                <button onClick={switchCamera} style={styles.control}>Switch camera</button>
              </>}
              {!recording && <button onClick={requestRecording} style={styles.control}>Request recording</button>}
              {recording && <><button onClick={pauseRecording} style={styles.control}>{recordingPaused ? "Resume recording" : "Pause recording"}</button><button onClick={stopRecording} style={styles.control}>Stop & save</button></>}
              <button onClick={hangup} style={styles.reject}>End call</button>
            </>}
          </div>
          <small style={styles.note}>Recording starts only after the other participant explicitly agrees. Camera and microphone are requested only when you start or answer a call.</small>
        </div>
      </div>}
    </div>
  );
}

const styles = {
  icon: { border: 0, borderRadius: 20, padding: "7px 10px", cursor: "pointer", background: "var(--primary)", color: "#fff", fontSize: 16 },
  backdrop: { position: "fixed", inset: 0, zIndex: 10000, background: "#080a0e", display: "grid", placeItems: "stretch", padding: 0 },
  panel: { width: "100vw", height: "100dvh", maxHeight: "100dvh", overflow: "hidden", borderRadius: 0, background: "radial-gradient(ellipse at top, #293342 0%, #10141c 58%, #080a0e 100%)", color: "#fff", padding: "max(12px, env(safe-area-inset-top)) 0 0", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 0 },
  heading: { display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "8px 8px 12px", flexShrink: 0 },
  videoStage: { position: "relative", background: "#050505", borderRadius: 0, overflow: "hidden", flex: 1, minHeight: 0, width: "100%", maxHeight: "none", margin: "0", boxShadow: "0 18px 55px rgba(0,0,0,.35)" },
  remoteVideo: { position: "absolute", inset: 0, width: "100%", height: "100%", minHeight: 0, objectFit: "cover", background: "#050505" },
  localVideo: { position: "absolute", right: 18, bottom: 18, width: "clamp(112px, 24vw, 210px)", height: "clamp(150px, 30vh, 270px)", aspectRatio: "3/4", objectFit: "cover", borderRadius: 18, border: "2px solid rgba(255,255,255,.9)", background: "#20242b", boxShadow: "0 12px 32px rgba(0,0,0,.5)" },
  avatar: { margin: "26px auto", width: 110, height: 110, borderRadius: "50%", background: "#343943", display: "grid", placeItems: "center", fontSize: 42 },
  controls: { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 12, padding: "14px 8px max(12px, env(safe-area-inset-bottom))", flexShrink: 0, background: "rgba(12,16,23,.96)", borderRadius: 22, boxShadow: "0 12px 36px rgba(0,0,0,.28)" },
  control: { border: 0, borderRadius: 24, padding: "10px 13px", background: "#3b4350", color: "#fff", cursor: "pointer" },
  accept: { border: 0, borderRadius: 24, padding: "11px 17px", background: "#16834b", color: "#fff", cursor: "pointer" },
  reject: { border: 0, borderRadius: 24, padding: "11px 17px", background: "#b83232", color: "#fff", cursor: "pointer" },
  consent: { padding: 12, marginTop: 10, borderRadius: 10, background: "#303641", textAlign: "center" },
  note: { display: "block", margin: "8px 14px 10px", textAlign: "center", color: "#b9c0cc", lineHeight: 1.35, fontSize: 11, flexShrink: 0 },
  savedToast: { position: "fixed", top: 72, left: "50%", transform: "translateX(-50%)", zIndex: 11000, padding: "11px 16px", borderRadius: 12, background: "#146c43", color: "#fff", fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,.35)", whiteSpace: "nowrap" },
};
