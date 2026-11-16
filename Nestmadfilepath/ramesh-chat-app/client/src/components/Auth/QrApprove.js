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
        {status === "camera" && (
          <div className="bp-qr-scanner">
            <video ref={video} muted playsInline style={s.video} />
            <div className="bp-qr-shade" />
            <div className="bp-qr-frame">
              <i /><i /><i /><i />
              <span className="bp-qr-beam" />
            </div>
            <div className="bp-qr-hint"><span className="bp-qr-dot" /> SCANNING FOR QR CODE</div>
          </div>
        )}
        <style>{`
          .bp-qr-scanner{position:relative;width:100%;height:clamp(260px,58vw,390px);max-height:55vh;margin:18px 0 14px;border-radius:20px;overflow:hidden;background:#05070c;border:1px solid rgba(216,189,112,.28);box-shadow:0 18px 50px rgba(0,0,0,.35)}
          .bp-qr-shade{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 34%,rgba(3,6,13,.42) 100%);pointer-events:none}
          .bp-qr-frame{position:absolute;width:min(68%,260px);aspect-ratio:1;left:50%;top:45%;transform:translate(-50%,-50%);border:1px solid rgba(232,210,141,.24);border-radius:22px;box-shadow:0 0 0 999px rgba(2,5,12,.12),0 0 34px rgba(216,189,112,.14);pointer-events:none}
          .bp-qr-frame i{position:absolute;width:30px;height:30px;border-color:#f0d98e;border-style:solid;filter:drop-shadow(0 0 7px rgba(240,217,142,.75))}
          .bp-qr-frame i:nth-child(1){top:-2px;left:-2px;border-width:3px 0 0 3px;border-radius:10px 0 0}
          .bp-qr-frame i:nth-child(2){top:-2px;right:-2px;border-width:3px 3px 0 0;border-radius:0 10px 0 0}
          .bp-qr-frame i:nth-child(3){bottom:-2px;left:-2px;border-width:0 0 3px 3px;border-radius:0 0 0 10px}
          .bp-qr-frame i:nth-child(4){bottom:-2px;right:-2px;border-width:0 3px 3px 0;border-radius:0 0 10px}
          .bp-qr-beam{position:absolute;left:7%;right:7%;height:2px;top:8%;background:linear-gradient(90deg,transparent,#f8e5a8,#fff4c8,#d8bd70,transparent);box-shadow:0 0 12px 3px rgba(232,210,141,.58);animation:bpQrScan 2.3s ease-in-out infinite}
          .bp-qr-hint{position:absolute;left:0;right:0;bottom:18px;text-align:center;color:#f5e6b4;font-size:10px;font-weight:900;letter-spacing:2px;text-shadow:0 2px 8px #000}
          .bp-qr-dot{display:inline-block;width:7px;height:7px;margin-right:8px;border-radius:50%;background:#b9f4cf;box-shadow:0 0 10px #4ade80;animation:bpQrPulse 1.2s ease-in-out infinite}
          @keyframes bpQrScan{0%{top:8%;opacity:.45}50%{top:90%;opacity:1}100%{top:8%;opacity:.45}}
          @keyframes bpQrPulse{0%,100%{opacity:.45;transform:scale(.8)}50%{opacity:1;transform:scale(1.15)}}
          @media(prefers-reduced-motion:reduce){.bp-qr-beam,.bp-qr-dot{animation:none}}
        `}</style>
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
  video: { width: "100%", height: "100%", objectFit: "cover", display: "block", background: "#05070c" },
  action: { width: "100%", padding: 14, border: 0, borderRadius: 12, background: "#d8bd70", fontWeight: 800 },
  small: { display: "block", marginTop: 18, color: "#9da5b7", fontSize: 11 },
};
