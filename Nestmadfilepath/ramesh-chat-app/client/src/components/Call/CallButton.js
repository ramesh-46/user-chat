// CallButton.jsx
import React, { useContext, useRef, useEffect, useState } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { useCall } from "../hooks/useCall";

/**
 * Call UI component. It attaches audio elements to streams when they change
 * (no fragile null checks).
 */

export default function CallButton({ peer }) {
  const { user } = useContext(AuthContext);
  const {
    call,
    hangup,
    answer,
    decline,
    toggleMute,
    callState,
    incomingPeer,
    getLocalStream,
    getRemoteStream,
    isMuted,
    micPermission,
    requestMicPermission,
  } = useCall(user._id);

  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const [timer, setTimer] = useState(0);
  const ringingAudio = useRef(null);
  const callingAudio = useRef(null);
  const [showMicPrompt, setShowMicPrompt] = useState(false);

  // Check if we're on a mobile device
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // create audio elements lazily (so they can play on user gesture)
  useEffect(() => {
    ringingAudio.current = new Audio("/ringing-tone.mp3");
    callingAudio.current = new Audio("/calling-tone.mp3");
    return () => {
      try {
        ringingAudio.current?.pause();
        callingAudio.current?.pause();
      } catch {}
    };
  }, []);

  // If on mobile and mic permission is not granted, show prompt before call
  useEffect(() => {
    if (isMobile && callState === "idle" && micPermission !== "granted") {
      setShowMicPrompt(true);
    } else {
      setShowMicPrompt(false);
    }
  }, [micPermission, callState, isMobile]);

  // Play / stop ring tones based on callState
  useEffect(() => {
    if (!ringingAudio.current || !callingAudio.current) return;

    if (callState === "calling") {
      ringingAudio.current.loop = true;
      ringingAudio.current.play().catch(() => {});
    } else {
      ringingAudio.current.pause();
      ringingAudio.current.currentTime = 0;
    }

    if (callState === "incoming") {
      callingAudio.current.loop = true;
      callingAudio.current.play().catch(() => {});
    } else {
      callingAudio.current.pause();
      callingAudio.current.currentTime = 0;
    }
  }, [callState]);

  // Attach local stream to hidden audio element (muted)
  useEffect(() => {
    const localStream = getLocalStream();
    if (localRef.current) {
      try {
        localRef.current.srcObject = localStream || null;
      } catch (err) {
        console.error("Error attaching local stream to audio element:", err);
      }
    }
  }, [getLocalStream, isMuted, callState]);

  // Attach remote stream to hidden audio element
  useEffect(() => {
    const remoteStream = getRemoteStream();
    if (remoteRef.current) {
      try {
        remoteRef.current.srcObject = remoteStream || null;
      } catch (err) {
        console.error("Error attaching remote stream to audio element:", err);
      }
    }
  }, [getRemoteStream, callState]);

  // Call timer
  useEffect(() => {
    if (callState !== "connected") {
      setTimer(0);
      return;
    }
    const interval = setInterval(() => setTimer((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [callState]);

  const formatTime = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // Styles
  const containerStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.8)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  };
  const avatarStyle = {
    width: 100,
    height: 100,
    borderRadius: "50%",
    background: "#ccc",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 40,
    marginBottom: 20,
  };
  const nameStyle = { color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 10 };
  const statusStyle = { color: "#aaa", fontSize: 16, marginBottom: 30 };
  const buttonStyle = {
    padding: "12px 24px",
    margin: "0 10px",
    border: "none",
    borderRadius: 50,
    fontSize: 18,
    cursor: "pointer",
    fontWeight: "bold",
  };

  // Handle call initiation with mic check
  const handleCall = async () => {
    if (isMobile && micPermission !== "granted") {
      const granted = await requestMicPermission();
      if (!granted) {
        alert("Microphone access is required to make calls.");
        return;
      }
    }
    call(peer._id, peer);
  };

  return (
    <>
      {/* Hidden audio elements */}
      <audio ref={localRef} autoPlay muted style={{ display: "none" }} />
      <audio ref={remoteRef} autoPlay style={{ display: "none" }} />

      {/* Mic Permission Prompt (Mobile Only) */}
      {showMicPrompt && (
        <div style={containerStyle}>
          <div style={{ color: "#fff", fontSize: 20, marginBottom: 20, textAlign: "center", padding: "0 20px" }}>
            🎤 Microphone access required for calls
          </div>
          <button
            onClick={requestMicPermission}
            style={{
              ...buttonStyle,
              background: "#2196f3",
              color: "#fff",
              padding: "14px 28px",
            }}
          >
            Allow Microphone
          </button>
        </div>
      )}

      {callState !== "idle" && !showMicPrompt && (
        <div style={containerStyle}>
          <div style={avatarStyle}>👤</div>
          <div style={nameStyle}>
            {(callState === "incoming" ? incomingPeer : peer)?.username || "Unknown"}
          </div>

          {callState === "calling" && <div style={statusStyle}>Calling...</div>}
          {callState === "incoming" && <div style={statusStyle}>Incoming Call</div>}
          {callState === "connected" && <div style={statusStyle}>{formatTime(timer)}</div>}
          {callState === "ended" && <div style={statusStyle}>Call Ended</div>}

          <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
            {callState === "incoming" && (
              <>
                <button onClick={answer} style={{ ...buttonStyle, background: "#4caf50", color: "#fff" }}>
                  Answer
                </button>
                <button onClick={decline} style={{ ...buttonStyle, background: "#f44336", color: "#fff" }}>
                  Decline
                </button>
              </>
            )}

            {callState === "calling" && (
              <button onClick={hangup} style={{ ...buttonStyle, background: "#f44336", color: "#fff" }}>
                Cancel
              </button>
            )}

            {callState === "connected" && (
              <>
                <button
                  onClick={toggleMute}
                  style={{ ...buttonStyle, background: isMuted ? "#ff9800" : "#2196f3", color: "#fff" }}
                >
                  {isMuted ? "Unmute" : "Mute"}
                </button>
                <button onClick={hangup} style={{ ...buttonStyle, background: "#f44336", color: "#fff" }}>
                  End Call
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {callState === "idle" && !showMicPrompt && (
        <button
          onClick={handleCall}
          style={{
            ...buttonStyle,
            background: "#4caf50",
            color: "#fff",
            width: 60,
            height: 60,
            borderRadius: "50%",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          📞
        </button>
      )}
    </>
  );
}
