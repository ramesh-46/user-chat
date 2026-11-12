import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";

const qrPhoneLog = (stage, details = {}) => {
  // Do not log QR secret, Firebase tokens, or full QR URL.
  console.info("[QR_LOGIN][phone]", { stage, at: new Date().toISOString(), ...details });
};

export default function QrApprove() {
  const video = useRef(null);
  const stream = useRef(null);
  const [status, setStatus] = useState("camera");
  const [message, setMessage] = useState("Scan the QR code displayed on your new device.");
  const [pair, setPair] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    let frame = 0;
    let detector;
    qrPhoneLog("frontend.camera.start_requested");
    async function start() {
      if (!("BarcodeDetector" in window)) {
        qrPhoneLog("frontend.camera.unsupported");
        setStatus("unsupported");
        setMessage("QR scanning requires Chrome with BarcodeDetector support.");
        return;
      }
      try {
        qrPhoneLog("frontend.camera.permission_requested");
        stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        qrPhoneLog("frontend.camera.permission_granted", { videoTracks: stream.current.getVideoTracks().length });
        video.current.srcObject = stream.current;
        await video.current.play();
        qrPhoneLog("frontend.camera.preview_started");
        detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        async function scan() {
          if (!active) return;
          try {
            const found = await detector.detect(video.current);
            if (found.length) {
              const url = new URL(found[0].rawValue);
              const sessionId = url.searchParams.get("session");
              const secret = url.searchParams.get("secret");
              if (sessionId && secret) {
                qrPhoneLog("frontend.qr.detected", { hasSessionId: true, hasSecret: true });
                setPair({ sessionId, secret });
                setStatus("confirm");
                setMessage("QR detected. Approve only if you started this login.");
                return;
              }
              qrPhoneLog("frontend.qr.invalid_payload");
            }
          } catch (error) {
            // BarcodeDetector can briefly fail while a camera frame is unavailable.
            if (error?.name !== "NotFoundException") {
              qrPhoneLog("frontend.qr.scan_frame_error", { name: error?.name || "Error", message: error?.message || "Frame scan failed" });
            }
          }
          frame = requestAnimationFrame(scan);
        }
        scan();
      } catch (error) {
        qrPhoneLog("frontend.camera.failed", { name: error?.name || "Error", message: error?.message || "Camera access failed" });
        setStatus("error");
        setMessage(error.message || "Camera access failed.");
      }
    }
    start();
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      if (stream.current) stream.current.getTracks().forEach(track => track.stop());
      qrPhoneLog("frontend.camera.stopped");
    };
  }, []);

  async function approve() {
    const startedAt = Date.now();
    qrPhoneLog("frontend.approve.request", { hasPair: Boolean(pair) });
    try {
      setBusy(true);
      const response = await api.post("/auth-extra/qr/approve", pair);
      qrPhoneLog("frontend.approve.success", { httpStatus: response.status, durationMs: Date.now() - startedAt });
      setStatus("done");
      setMessage("Login approved. Return to the other device.");
    } catch (error) {
      qrPhoneLog("frontend.approve.failed", {
        httpStatus: error.response?.status || null,
        serverCode: error.response?.data?.code || null,
        firebaseCode: error.code || null,
        durationMs: Date.now() - startedAt,
        message: error.response?.data?.error || error.message || "Approval failed",
      });
      setStatus("error");
      setMessage(error.response?.data?.error || "Approval failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={s.page}>
      <section style={s.card}>
        <button style={s.back} onClick={() => navigate("/")}>← Back</button>
        <h2>Connect a device</h2>
        <p>{message}</p>
        {status === "camera" && <video ref={video} muted playsInline style={s.video} />}
        {status === "confirm" && <button style={s.action} onClick={approve} disabled={busy}>{busy ? "Approving…" : "Approve login"}</button>}
        {status === "done" && <button style={s.action} onClick={() => navigate("/")}>Done</button>}
        {status === "unsupported" && <button style={s.action} onClick={() => navigate("/")}>Back to chat</button>}
        {status === "error" && <button style={s.action} onClick={() => window.location.reload()}>Try again</button>}
        <small>QR codes expire after two minutes. Only approve devices you recognize.</small>
      </section>
    </main>
  );
}

const s = {
  page: { minHeight: "100dvh", display: "grid", placeItems: "center", padding: 16, background: "#080b14", color: "#f8f5eb" },
  card: { width: "min(100%,440px)", padding: 26, borderRadius: 22, background: "#151b2b", border: "1px solid #d8bd7055", textAlign: "center", boxSizing: "border-box" },
  back: { display: "block", border: 0, background: "transparent", color: "#d8bd70" },
  video: { width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: 16, background: "#05070c" },
  action: { width: "100%", padding: 14, border: 0, borderRadius: 12, background: "#d8bd70", fontWeight: 800 },
  small: { display: "block", marginTop: 18, color: "#9da5b7", fontSize: 11 },
};
