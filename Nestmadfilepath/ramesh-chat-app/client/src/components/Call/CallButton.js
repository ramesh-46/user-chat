import React, { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { useCall } from "../hooks/useCall";

export default function CallButton({ peer }) {
  const { user } = useContext(AuthContext);
  const {
    call, hangup, answer, decline, toggleMute, toggleCamera, switchCamera,
    requestRecording, acceptRecording, stopRecording,
    callState, incomingPeer, mediaMode, isMuted, cameraEnabled, recording,
    recordingRequest, getLocalStream, getRemoteStream, localVersion, remoteVersion,
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
    <div style={{ position: "fixed", right: 16, bottom: 82, zIndex: 1200, display: "inline-flex", alignItems: "center", gap: 6 }}>
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
              {recording && <button onClick={stopRecording} style={styles.control}>Stop & save</button>}
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
  backdrop: { position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.82)", display: "grid", placeItems: "center", padding: 12 },
  panel: { width: "min(560px, 100%)", maxHeight: "92dvh", overflow: "auto", borderRadius: 18, background: "#17191f", color: "#fff", padding: 18, boxSizing: "border-box" },
  heading: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 8 },
  videoStage: { position: "relative", background: "#050505", borderRadius: 14, overflow: "hidden", minHeight: 220, aspectRatio: "16/9" },
  remoteVideo: { width: "100%", height: "100%", minHeight: 220, objectFit: "contain", background: "#050505" },
  localVideo: { position: "absolute", right: 10, bottom: 10, width: "27%", maxHeight: 140, aspectRatio: "3/4", objectFit: "cover", borderRadius: 10, background: "#333" },
  avatar: { margin: "26px auto", width: 110, height: 110, borderRadius: "50%", background: "#343943", display: "grid", placeItems: "center", fontSize: 42 },
  controls: { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 18 },
  control: { border: 0, borderRadius: 24, padding: "10px 13px", background: "#3b4350", color: "#fff", cursor: "pointer" },
  accept: { border: 0, borderRadius: 24, padding: "11px 17px", background: "#16834b", color: "#fff", cursor: "pointer" },
  reject: { border: 0, borderRadius: 24, padding: "11px 17px", background: "#b83232", color: "#fff", cursor: "pointer" },
  consent: { padding: 12, marginTop: 10, borderRadius: 10, background: "#303641", textAlign: "center" },
  note: { display: "block", marginTop: 16, textAlign: "center", color: "#b9c0cc", lineHeight: 1.4 },
};
