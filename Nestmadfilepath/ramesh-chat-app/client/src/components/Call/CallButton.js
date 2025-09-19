import React, { useContext, useRef, useEffect, useState } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { useCall } from "../hooks/useCall";
import { motion, AnimatePresence } from "framer-motion";

export default function CallButton({ peer }) {
  const { user } = useContext(AuthContext);
  const { call, hangup, answer, getLocalStream, getRemoteStream, callState } =
    useCall(user._id);

  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const [timer, setTimer] = useState(0);

  // Attach streams to audio elements
  useEffect(() => {
    if (getLocalStream()) localRef.current.srcObject = getLocalStream();
    if (getRemoteStream()) remoteRef.current.srcObject = getRemoteStream();
  }, [getLocalStream, getRemoteStream]);

  // Timer logic
  useEffect(() => {
    if (callState !== "connected") {
      setTimer(0);
      return;
    }
    const interval = setInterval(() => setTimer((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [callState]);

  // Format time
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? `${hrs}:` : ""}${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Styles
  const containerStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    zIndex: 9999,
    flexDirection: "column",
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

  const nameStyle = {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  };

  const statusStyle = {
    color: "#aaa",
    fontSize: 16,
    marginBottom: 30,
  };

  const buttonStyle = {
    padding: "12px 24px",
    margin: "0 10px",
    border: "none",
    borderRadius: "50px",
    fontSize: 18,
    cursor: "pointer",
    fontWeight: "bold",
  };

  const incomingCallStyle = {
    ...containerStyle,
    flexDirection: "column",
    justifyContent: "center",
  };

  return (
    <>
      {/* Local hidden audio */}
      <audio ref={localRef} autoPlay muted style={{ display: "none" }} />
      <audio ref={remoteRef} autoPlay style={{ display: "none" }} />

      {/* Only show modal if in a call state */}
      <AnimatePresence>
        {callState !== "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={containerStyle}
          >
            <div style={{ textAlign: "center" }}>
              {/* Avatar Placeholder */}
              <div style={avatarStyle}>👤</div>

              {/* Name */}
              <div style={nameStyle}>
                {peer?.username || peer?.mobile || "Unknown"}
              </div>

              {/* Status & Timer */}
              {callState === "calling" && (
                <div style={statusStyle}>Calling...</div>
              )}
              {callState === "incoming" && (
                <div style={statusStyle}>Incoming Call</div>
              )}
              {callState === "connected" && (
                <div style={statusStyle}>{formatTime(timer)}</div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                {callState === "incoming" && (
                  <>
                    <button
                      onClick={answer}
                      style={{
                        ...buttonStyle,
                        background: "#4caf50",
                        color: "#fff",
                      }}
                    >
                      Answer
                    </button>
                    <button
                      onClick={hangup}
                      style={{
                        ...buttonStyle,
                        background: "#f44336",
                        color: "#fff",
                      }}
                    >
                      Decline
                    </button>
                  </>
                )}

                {callState === "calling" && (
                  <button
                    onClick={hangup}
                    style={{
                      ...buttonStyle,
                      background: "#f44336",
                      color: "#fff",
                    }}
                  >
                    Cancel
                  </button>
                )}

                {callState === "connected" && (
                  <button
                    onClick={hangup}
                    style={{
                      ...buttonStyle,
                      background: "#f44336",
                      color: "#fff",
                    }}
                  >
                    End Call
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Call Button – Always visible */}
      <AnimatePresence>
        {callState === "connected" && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            style={{
              position: "fixed",
              bottom: 20,
              right: 20,
              zIndex: 9998,
            }}
          >
            <button
              style={{
                ...buttonStyle,
                background: "#f44336",
                color: "#fff",
                width: 60,
                height: 60,
                borderRadius: "50%",
                boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              }}
              onClick={hangup}
              title="End Call"
            >
              🔴
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Call Trigger Button – Hidden when full screen call active */}
      {callState === "idle" && (
        <button
          style={{
            ...buttonStyle,
            background: "#4caf50",
            color: "#fff",
            width: 60,
            height: 60,
            borderRadius: "50%",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
          onClick={() => call(peer._id)}
          title={`Call ${peer.username}`}
        >
          📞
        </button>
      )}
    </>
  );
}