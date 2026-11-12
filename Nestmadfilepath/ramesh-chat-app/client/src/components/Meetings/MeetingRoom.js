import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import { auth } from "../../firebase";
import socket from "../../socket";
import { joinMeeting } from "../../api";

// Native WebRTC mesh — Sura Chat's own engine, no third-party meeting SDK.
const CFG = {
  iceServers: [
    { urls: "stun\:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 4,
};

// Video filters applied with GPU-accelerated CSS filters (fast rendering).
const FILTERS = {
  none: "none",
  soft: "brightness(1.08) saturate(1.12)",
  mono: "grayscale(1) contrast(1.06)",
  warm: "sepia(.45) saturate(1.25)",
  cool: "hue-rotate(14deg) saturate(1.12) brightness(1.05)",
  vintage: "sepia(.55) contrast(.94) brightness(1.06) saturate(.85)",
};

// Track-aware tile: shows video based on the REAL video track state
// (mute/unmute events from the browser), so video appears the moment
// someone turns their camera on and hides only when there is truly
// no live video.
function Tile({ stream, name, local, filter, style, spotlight, onPick }) {
  const ref = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream || null;
    const video = stream?.getVideoTracks?.()[0] || null;
    const update = () => setHasVideo(!!video && video.readyState === "live" && !video.muted);
    update();
    if (video) {
      video.addEventListener("mute", update);
      video.addEventListener("unmute", update);
      video.addEventListener("ended", update);
    }
    const poll = setInterval(update, 1500); // safety net for browsers that skip events
    return () => {
      if (video) {
        video.removeEventListener("mute", update);
        video.removeEventListener("unmute", update);
        video.removeEventListener("ended", update);
      }
      clearInterval(poll);
      if (ref.current) ref.current.srcObject = null;
    };
  }, [stream]);
  return (
    <div style={{ ...u.tile, ...(style || {}), ...(spotlight ? u.tileSpot : {}) }} onClick={onPick} title={onPick ? "Click to spotlight" : undefined}>
      <video ref={ref} autoPlay playsInline muted={local} style={{ ...u.video, filter: FILTERS[filter] || "none", opacity: hasVideo ? 1 : 0 }} />
      {!hasVideo && <div style={u.avatar}>{String(name || "?").trim()[0]?.toUpperCase()}</div>}
      <span style={u.name}>{name}{local ? " (You)" : ""}</span>
    </div>
  );
}

export default function MeetingRoom() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const myUserId = String(user?._id || user?.userId || "");
  const myName = user?.name || user?.username || auth.currentUser?.displayName || "You";

  const localStream = useRef(null);
  const pcs = useRef(new Map());
  const iceQueue = useRef(new Map());
  const pendingToken = useRef(null);
  const finished = useRef(false);
  const previewRef = useRef(null);

  const [phase, setPhase] = useState("prejoin"); // prejoin | lobby | live | ended
  const [endMessage, setEndMessage] = useState("");
  const [meeting, setMeeting] = useState(null);
  const [passcode, setPasscode] = useState(location.state?.passcode || "");
  const [needsPasscode, setNeedsPasscode] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [audioOnly, setAudioOnly] = useState(false);
  const [participants, setParticipants] = useState({}); // socketId -> {name, stream, mic, cam, audioOnly, userId}
  const [hostUserId, setHostUserId] = useState(location.state?.isHost ? myUserId : null);
  const [knocks, setKnocks] = useState([]);
  const [hands, setHands] = useState({});
  const [handRaised, setHandRaised] = useState(false);
  const [layout, setLayout] = useState("grid"); // grid | speaker
  const [spotlight, setSpotlight] = useState(null);
  const [filter, setFilter] = useState("none");
  const [panel, setPanel] = useState(""); // "" | people | chat
  const [chat, setChat] = useState([]);
  const [chatDraft, setChatDraft] = useState("");
  const [reactions, setReactions] = useState([]);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Network speed badge (like the 1-1 call): Mbps + ping from WebRTC stats.
  const [netStats, setNetStats] = useState({ mbps: 0, rtt: null });
  useEffect(() => {
    if (phase !== "live") return undefined;
    const timer = setInterval(async () => {
      const pc = pcs.current.values().next().value;
      if (!pc) return;
      try {
        const stats = await pc.getStats();
        let bytes = 0, rtt = null;
        stats.forEach((r) => {
          if (r.type === "inbound-rtp" && r.bytesReceived) bytes += r.bytesReceived;
          if (r.type === "candidate-pair" && r.state === "succeeded" && r.currentRoundTripTime != null) rtt = Math.round(r.currentRoundTripTime * 1000);
        });
        setNetStats((prev) => {
          const mbps = prev.at ? Math.max(0, ((bytes - prev.bytes) * 8) / ((Date.now() - prev.at) * 1000)) : 0;
          return { mbps, rtt, bytes, at: Date.now() };
        });
      } catch (_) {}
    }, 2000);
    return () => clearInterval(timer);
  }, [phase]);

  const isHost = !!hostUserId && hostUserId === myUserId;

  /* ---------- media (with audio-only fallback for devices without camera) ---------- */
  const acquireMedia = useCallback(async () => {
    if (localStream.current) return localStream.current;
    // Group audio call: the caller chose "audio only" from the group header.
    if (location.state?.audioOnly) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      localStream.current = stream;
      setAudioOnly(true); setCameraOn(false);
      return stream;
    }
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera and microphone need HTTPS.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      });
      localStream.current = stream;
      setAudioOnly(false); setCameraOn(true);
      return stream;
    } catch (_) {
      // No camera (or permission denied) — join with audio only. You still see
      // everyone else's video; they see your name tile.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.current = stream;
      setAudioOnly(true); setCameraOn(false);
      return stream;
    }
  }, [location.state]);

  // Prejoin camera preview.
  useEffect(() => {
    let dead = false;
    acquireMedia().then((stream) => { if (!dead && previewRef.current) previewRef.current.srcObject = stream; })
      .catch((e) => !dead && setError(e.message || "Could not access microphone."));
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- REST validation ---------- */
  const prepare = useCallback(async () => {
    if (meeting) return meeting;
    try {
      const res = await joinMeeting(roomId, passcode);
      setMeeting(res.data.meeting);
      if (res.data.meeting.isHost) setHostUserId(myUserId);
      return res.data.meeting;
    } catch (e) {
      const msg = e.response?.data?.error || "Could not open this meeting.";
      if (e.response?.status === 403 && /passcode/i.test(msg)) setNeedsPasscode(true);
      setError(msg);
      return null;
    }
  }, [meeting, roomId, passcode, myUserId]);

  useEffect(() => { prepare(); /* eslint-disable-next-line */ }, []);

  /* ---------- WebRTC mesh ---------- */
  const ensure = useCallback((id, name) => {
    if (pcs.current.has(id)) return pcs.current.get(id);
    const pc = new RTCPeerConnection(CFG);
    const remote = new MediaStream();
    localStream.current?.getTracks().forEach((t) => pc.addTrack(t, localStream.current));
    pc.ontrack = (e) => {
      (e.streams?.[0]?.getTracks() || [e.track]).forEach((t) => {
        if (!remote.getTracks().some((x) => x.id === t.id)) remote.addTrack(t);
      });
      setParticipants((p) => ({ ...p, [id]: { ...(p[id] || {}), id, name: name || p[id]?.name || "Participant", stream: remote } }));
    };
    pc.onicecandidate = (e) => e.candidate && socket.emit("meeting\:signal", { roomId, to: id, kind: "ice", payload: e.candidate });
    pc.onconnectionstatechange = () => {
      if (["failed", "closed"].includes(pc.connectionState)) {
        pc.close(); pcs.current.delete(id);
        setParticipants((p) => { const n = { ...p }; delete n[id]; return n; });
      }
    };
    pcs.current.set(id, pc);
    setParticipants((p) => ({ ...p, [id]: { id, name: name || "Participant", stream: remote, mic: true, cam: true } }));
    return pc;
  }, [roomId]);

  const offer = useCallback(async (peer) => {
    const pc = ensure(peer.socketId, peer.name);
    if (pc.signalingState !== "stable") return;
    const d = await pc.createOffer();
    await pc.setLocalDescription(d);
    socket.emit("meeting\:signal", { roomId, to: peer.socketId, kind: "offer", payload: pc.localDescription });
  }, [ensure, roomId]);

  const broadcastState = useCallback((overrides = {}) => {
    const payload = { mic: !muted, cam: cameraOn && !audioOnly, audioOnly, userId: myUserId, name: myName, ...overrides };
    Object.keys(pcs.current).forEach((id) => socket.emit("meeting\:signal", { roomId, to: id, kind: "state", payload }));
  }, [muted, cameraOn, audioOnly, myUserId, myName, roomId]);

  useEffect(() => { if (phase === "live") broadcastState(); }, [phase, broadcastState]);

  /* ---------- join flow ---------- */
  const socketJoin = useCallback((token) => {
    const send = () => socket.emit("meeting\:join", { roomId, token, displayName: myName });
    if (socket.connected) send();
    else { socket.once("connect", send); socket.connect(); }
  }, [roomId, myName]);

  const start = async () => {
    if (starting) return;
    setStarting(true); setError("");
    const info = await prepare();
    if (!info) { setStarting(false); return; }
    try { await acquireMedia(); }
    catch (e) { setError(e.message || "Could not access microphone."); setStarting(false); return; }
    const token = await auth.currentUser?.getIdToken();
    if (!token) { setError("Sign in to Sura Chat before joining."); setStarting(false); return; }
    pendingToken.current = token;
    if (info.waitingRoom && !info.isHost) {
      setPhase("lobby");
      socket.emit("meeting\:knock", { roomId, token, name: myName });
      setStarting(false);
    } else {
      socketJoin(token);
    }
  };

  const cancelKnock = () => {
    socket.emit("meeting\:knock-cancel", { roomId });
    setPhase("prejoin");
  };

  /* ---------- full cleanup: stop camera AND microphone tracks ---------- */
  const stopEverything = useCallback(() => {
    pcs.current.forEach((pc) => pc.close());
    pcs.current.clear();
    iceQueue.current.clear();
    localStream.current?.getTracks().forEach((t) => { try { t.stop(); } catch (_) {} });
    localStream.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
    setParticipants({});
  }, []);

  const finish = useCallback((message, leaveRoom = true) => {
    if (finished.current) return;
    finished.current = true;
    if (leaveRoom) socket.emit("meeting\:leave", { roomId });
    stopEverything();
    setEndMessage(message || "");
    setPhase("ended");
  }, [roomId, stopEverything]);

  // Stop media when the tab/window closes mid-meeting.
  useEffect(() => {
    const onUnload = () => stopEverything();
    window.addEventListener("pagehide", onUnload);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [stopEverything]);

  // Unmount: always release camera + microphone.
  useEffect(() => () => {
    socket.emit("meeting\:leave", { roomId });
    pcs.current.forEach((pc) => pc.close());
    pcs.current.clear();
    localStream.current?.getTracks().forEach((t) => { try { t.stop(); } catch (_) {} });
    localStream.current = null;
  }, [roomId]);

  /* ---------- socket listeners ---------- */
  useEffect(() => {
    const onJoined = async ({ peers = [] } = {}) => {
      setPhase("live"); finished.current = false;
      setKnocks([]);
      for (const p of peers) await offer(p);
      setTimeout(() => broadcastState(), 600);
    };
    const onPeer = ({ peerId, name }) => peerId && ensure(peerId, name);
    const onLeft = ({ peerId }) => {
      pcs.current.get(peerId)?.close();
      pcs.current.delete(peerId); iceQueue.current.delete(peerId);
      setParticipants((p) => { const n = { ...p }; delete n[peerId]; return n; });
      setHands((h) => { const n = { ...h }; delete n[peerId]; return n; });
    };
    const onSignal = async ({ from, kind, payload }) => {
      if (!from || !payload) return;
      try {
        if (kind === "state") {
          setParticipants((p) => ({
            ...p, [from]: { ...(p[from] || { id: from, name: payload.name || "Participant" }), mic: payload.mic, cam: payload.cam, audioOnly: payload.audioOnly, userId: payload.userId, name: payload.name || p[from]?.name || "Participant" }
          }));
          return;
        }
        const pc = ensure(from, "Participant");
        if (kind === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(payload));
          for (const c of iceQueue.current.get(from) || []) await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          iceQueue.current.delete(from);
          const a = await pc.createAnswer();
          await pc.setLocalDescription(a);
          socket.emit("meeting\:signal", { roomId, to: from, kind: "answer", payload: pc.localDescription });
        } else if (kind === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(payload));
          for (const c of iceQueue.current.get(from) || []) await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          iceQueue.current.delete(from);
        } else if (kind === "ice") {
          if (pc.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(payload)).catch(() => {});
          else iceQueue.current.set(from, [...(iceQueue.current.get(from) || []), payload]);
        }
      } catch (e) { console.warn("Meeting signaling failed", e); }
    };
    const onKnock = (data) => {
      if (!data?.socketId) return;
      setKnocks((list) => list.some((k) => k.socketId === data.socketId) ? list : [...list, data]);
    };
    const onAdmitted = ({ roomId: code } = {}) => {
      if (String(code) === String(roomId) && pendingToken.current) {
        finished.current = false;
        socketJoin(pendingToken.current);
      }
    };
    const onDenied = ({ reason } = {}) => finish(reason || "The host denied your request to join.");
    const onEnded = () => finish("The host ended this meeting for everyone.");
    const onRemoved = () => finish("The host removed you from this meeting.");
    const onLocked = ({ locked: value } = {}) => setLocked(!!value);
    const onHostChanged = ({ hostUserId: newHost } = {}) => {
      if (!newHost) return;
      setHostUserId(String(newHost));
      setChat((c) => [...c, { peerId: "system", name: "Sura Chat", text: String(newHost) === myUserId ? "You are the host now 👑" : "Host controls were transferred.", at: new Date().toISOString() }]);
    };
    const onHand = ({ peerId, name, raised }) => {
      setHands((h) => { const n = { ...h }; if (raised) n[peerId] = name || "Participant"; else delete n[peerId]; return n; });
    };
    const onReaction = ({ emoji, name }) => {
      const item = { id: Math.random().toString(36).slice(2), emoji, name, left: 10 + Math.random() * 70 };
      setReactions((r) => [...r.slice(-9), item]);
      setTimeout(() => setReactions((r) => r.filter((x) => x.id !== item.id)), 3200);
    };
    const onChat = (message) => setChat((c) => [...c.slice(-80), message]);
    const onError = ({ message } = {}) => {
      if (phase === "live") setError(message || "Meeting error.");
      else finish(message || "Unable to join meeting.");
    };
    socket.on("meeting\:joined", onJoined);
    socket.on("meeting\:peer-joined", onPeer);
    socket.on("meeting\:peer-left", onLeft);
    socket.on("meeting\:signal", onSignal);
    socket.on("meeting\:knock", onKnock);
    socket.on("meeting\:admitted", onAdmitted);
    socket.on("meeting\:denied", onDenied);
    socket.on("meeting\:ended", onEnded);
    socket.on("meeting\:removed", onRemoved);
    socket.on("meeting\:locked", onLocked);
    socket.on("meeting\:host-changed", onHostChanged);
    socket.on("meeting\:hand", onHand);
    socket.on("meeting\:reaction", onReaction);
    socket.on("meeting\:chat", onChat);
    socket.on("meeting:error", onError);
    return () => {
      socket.off("meeting\:joined", onJoined);
      socket.off("meeting\:peer-joined", onPeer);
      socket.off("meeting\:peer-left", onLeft);
      socket.off("meeting\:signal", onSignal);
      socket.off("meeting\:knock", onKnock);
      socket.off("meeting\:admitted", onAdmitted);
      socket.off("meeting\:denied", onDenied);
      socket.off("meeting\:ended", onEnded);
      socket.off("meeting\:removed", onRemoved);
      socket.off("meeting\:locked", onLocked);
      socket.off("meeting\:host-changed", onHostChanged);
      socket.off("meeting\:hand", onHand);
      socket.off("meeting\:reaction", onReaction);
      socket.off("meeting:chat", onChat);
      socket.off("meeting\:error", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, ensure, offer, socketJoin, finish, broadcastState, myUserId]);

  /* ---------- controls ---------- */
  const toggleMic = () => {
    const next = !muted;
    localStream.current?.getAudioTracks().forEach((t) => { t.enabled = !next; });
    setMuted(next);
  };
  const toggleCam = () => {
    if (audioOnly) return setError("No camera is available on this device — you joined audio only.");
    const next = !cameraOn;
    localStream.current?.getVideoTracks().forEach((t) => { t.enabled = !next; });
    setCameraOn(next);
  };
  const toggleHand = () => {
    const next = !handRaised;
    setHandRaised(next);
    socket.emit("meeting\:hand", { roomId, raised: next });
  };
  const react = (emoji) => socket.emit("meeting\:reaction", { roomId, emoji });
  const sendChat = () => {
    const text = chatDraft.trim();
    if (!text) return;
    socket.emit("meeting\:chat", { roomId, text });
    setChat((c) => [...c, { peerId: "me", name: myName, text, at: new Date().toISOString() }]);
    setChatDraft("");
  };
  const admit = async (k, allow) => {
    setKnocks((list) => list.filter((x) => x.socketId !== k.socketId));
    const token = await auth.currentUser?.getIdToken();
    socket.emit("meeting:respond", { roomId, target: k.socketId, allow, token });
  };
  const lockRoom = () => {
    const token = auth.currentUser?.getIdToken();
    token.then((t) => socket.emit("meeting\:lock", { roomId, locked: !locked, token: t }));
  };
  const endForAll = async () => {
    const token = await auth.currentUser?.getIdToken();
    socket.emit("meeting:end", { roomId, token });
    finish("You ended the meeting for everyone.", false);
  };
  const removePeer = async (socketId) => {
    const token = await auth.currentUser?.getIdToken();
    socket.emit("meeting\:remove", { roomId, target: socketId, token });
  };
  const makeHost = async (socketId) => {
    const targetUserId = participants[socketId]?.userId;
    if (!targetUserId) return setError("Wait for that participant's status, then try again.");
    const token = await auth.currentUser?.getIdToken();
    socket.emit("meeting\:transfer", { roomId, targetUserId, token });
  };
  const leave = () => { finish(""); navigate("/"); };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch (_) { setError("Copy the meeting link from the address bar."); }
  };

  const peerList = Object.values(participants);
  const tileFilter = filter;

  /* ---------- render ---------- */
  return (
    <div style={u.page}>
      <style>{`@keyframes suraFloatUp{0%{transform\:translateY(0) scale(.7);opacity:0}12%{opacity:1}100%{transform\:translateY(-46vh) scale(1.35);opacity:0}}
@keyframes suraSpin{to{transform\:rotate(360deg)}}
@keyframes suraPulse{0%,100%{opacity:.45}50%{opacity:1}}`}</style>

      <header style={u.header}>
        <div>
          <b style={u.brand}>SURA CHAT MEETING</b>
          <small style={u.roomLabel}>{meeting?.title || "Meeting"} · {roomId.slice(0, 10)}{locked ? " · 🔒 locked" : ""}</small>
          <small style={{ ...u.roomLabel, color: netStats.mbps >= 1 ? "#6fe0a8" : "#e4a44d" }}>
            📶 {netStats.mbps.toFixed(2)} Mbps{netStats.rtt != null ? " · " + netStats.rtt + " ms" : ""}
          </small>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <select aria-label="Video filter" value={filter} onChange={(e) => setFilter(e.target.value)} style={u.select}>
            <option value="none">Filter: none</option>
            <option value="soft">✨ Soft glow</option>
            <option value="mono">⚫ Mono</option>
            <option value="warm">🌅 Warm</option>
            <option value="cool">❄️ Cool</option>
            <option value="vintage">🎞 Vintage</option>
          </select>
          <button style={u.ghost} onClick={() => setLayout(layout === "grid" ? "speaker" : "grid")}>
            {layout === "grid" ? "▭ Speaker view" : "▦ Grid view"}
          </button>
          <button style={u.ghost} onClick={copyLink}>{copied ? "Copied ✓" : "Copy invite"}</button>
          {isHost && phase === "live" && <>
            <button style={u.ghost} onClick={lockRoom}>{locked ? "🔓 Unlock" : "🔒 Lock room"}</button>
            <button style={u.dangerGhost} onClick={endForAll}>End for all</button>
          </>}
        </div>
      </header>

      {phase === "prejoin" && (
        <section style={u.lobby}>
          <div style={u.logo}>◆</div>
          <h1 style={u.h1}>{meeting?.title || "Ready to join?"}</h1>
          <p style={u.sub}>Multi-person video powered by Sura Chat WebRTC.</p>
          <div style={u.preview}>
            <video ref={previewRef} autoPlay playsInline muted style={{ ...u.video, filter: FILTERS[filter] || "none" }} />
            {audioOnly && <div style={u.audioOnly}>🎙 Audio only — no camera detected</div>}
          </div>
          {needsPasscode && <>
            <label style={u.label}>Meeting passcode</label>
            <input style={u.input} value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Passcode" maxLength={32} />
          </>}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
            <button style={{ ...u.ghost }} onClick={toggleMic}>{muted ? "Unmute" : "Mute"}</button>
            <button style={{ ...u.ghost }} onClick={toggleCam}>{audioOnly ? "Audio only" : cameraOn ? "Camera off" : "Camera on"}</button>
          </div>
          <button style={u.join} disabled={starting} onClick={start}>{starting ? "Connecting…" : "Join meeting"}</button>
          <button style={u.backLink} onClick={() => navigate("/")}>← Back to chat</button>
          {error && <p style={u.error}>{error}</p>}
        </section>
      )}

      {phase === "lobby" && (
        <section style={u.lobby}>
          <div style={{ ...u.spinner }} />
          <h1 style={u.h1}>Asking to join…</h1>
          <p style={u.sub}>The host will let you in soon. You can wait here.</p>
          <button style={u.ghost} onClick={cancelKnock}>Cancel</button>
          {error && <p style={u.error}>{error}</p>}
        </section>
      )}

      {phase === "live" && (
        <>
          {isHost && knocks.length > 0 && (
            <div style={u.knockBar}>
              {knocks.map((k) => (
                <div style={u.knockRow} key={k.socketId}>
                  <span>🚪 <b>{k.name}</b> wants to join</span>
                  <span>
                    <button style={u.admit} onClick={() => admit(k, true)}>Admit</button>
                    <button style={u.deny} onClick={() => admit(k, false)}>Deny</button>
                  </span>
                </div>
              ))}
            </div>
          )}

          <main style={layout === "grid" ? u.grid : u.speakerWrap}>
            {layout === "speaker" ? (
              <>
                {(() => {
                  const spot = peerList.find((p) => p.id === spotlight) || peerList[0];
                  return spot ? (
                    <Tile stream={spot.stream} name={spot.name}
                      filter={tileFilter} spotlight style={{ flex: 1, minHeight: 0, width: "100%" }} />
                  ) : null;
                })()}
                <div style={u.strip}>
                  <Tile stream={localStream.current} name={myName} local
                    filter={tileFilter} style={u.stripTile} onPick={() => setSpotlight(null)} />
                  {peerList.filter((p) => p.id !== spotlight).map((p) => (
                    <Tile key={p.id} stream={p.stream} name={p.name}
                      filter={tileFilter} style={u.stripTile} onPick={() => setSpotlight(p.id)} />
                  ))}
                </div>
              </>
            ) : (
              <>
                <Tile stream={localStream.current} name={myName} local filter={tileFilter} />
                {peerList.map((p) => (
                  <Tile key={p.id} stream={p.stream} name={p.name}
                    filter={tileFilter} onPick={() => { setLayout("speaker"); setSpotlight(p.id); }} />
                ))}
              </>
            )}
          </main>

          {hands && Object.keys(hands).length > 0 && (
            <div style={u.handsBar}>✋ {Object.values(hands).join(", ")}</div>
          )}

          <div style={u.reactionLayer}>
            {reactions.map((r) => (
              <span key={r.id} style={{ ...u.reaction, left: r.left + "%" }}>{r.emoji} <small>{r.name}</small></span>
            ))}
          </div>

          {panel === "people" && (
            <aside style={u.sidePanel}>
              <div style={u.panelHead}><b>People ({peerList.length + 1})</b><button style={u.x} onClick={() => setPanel("")}>✕</button></div>
              <div style={u.personRow}><span>👑 {myName} (You{isHost ? " · host" : ""})</span></div>
              {peerList.map((p) => (
                <div style={u.personRow} key={p.id}>
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {hostUserId && p.userId === hostUserId ? "👑 " : ""}{p.name}{p.audioOnly ? " 🎙" : ""}
                  </span>
                  {isHost && (
                    <span style={{ display: "flex", gap: 6 }}>
                      <button style={u.tiny} onClick={() => makeHost(p.id)}>Make host</button>
                      <button style={{ ...u.tiny, color: "#ff8f96" }} onClick={() => removePeer(p.id)}>Remove</button>
                    </span>
                  )}
                </div>
              ))}
            </aside>
          )}

          {panel === "chat" && (
            <aside style={u.sidePanel}>
              <div style={u.panelHead}><b>In-meeting chat</b><button style={u.x} onClick={() => setPanel("")}>✕</button></div>
              <div style={u.chatFlow}>
                {chat.length === 0 && <p style={u.sub}>No messages yet.</p>}
                {chat.map((m, i) => (
                  <div key={i} style={u.chatMsg}><b>{m.peerId === "me" ? "You" : m.name}:</b> {m.text}</div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, padding: 10 }}>
                <input style={u.input} value={chatDraft} onChange={(e) => setChatDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()} placeholder="Message everyone" maxLength={500} />
                <button style={u.join} onClick={sendChat}>➤</button>
              </div>
            </aside>
          )}

          <footer style={u.controls}>
            <button style={{ ...u.ctrl, ...(muted ? u.ctrlActive : {}) }} onClick={toggleMic}>{muted ? "🔇" : "🎤"}<span>{muted ? "Unmute" : "Mute"}</span></button>
            <button style={{ ...u.ctrl, ...((!cameraOn || audioOnly) ? u.ctrlActive : {}) }} onClick={toggleCam}>{audioOnly ? "🎙" : cameraOn ? "📷" : "🚫"}<span>{audioOnly ? "Audio only" : cameraOn ? "Camera off" : "Camera on"}</span></button>
            <button style={{ ...u.ctrl, ...(handRaised ? u.ctrlActive : {}) }} onClick={toggleHand}>✋<span>{handRaised ? "Lower hand" : "Raise hand"}</span></button>
            <button style={u.ctrl} onClick={() => setPanel(panel === "chat" ? "" : "chat")}>💬<span>Chat</span></button>
            <button style={u.ctrl} onClick={() => setPanel(panel === "people" ? "" : "people")}>👥<span>People</span></button>
            <button style={u.leave} onClick={leave}>📞<span>Leave</span></button>
          </footer>
          <div style={u.reactionBar}>
            {["👍", "👏", "❤️", "😂", "🎉", "😮"].map((e) => <button key={e} style={u.emojiBtn} onClick={() => react(e)}>{e}</button>)}
          </div>
        </>
      )}

      {phase === "ended" && (
        <section style={u.lobby}>
          <div style={u.logo}>■</div>
          <h1 style={u.h1}>Meeting ended</h1>
          <p style={u.sub}>{endMessage || "You left the meeting. Camera and microphone are now off."}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {endMessage.includes("host") ? null : (
              <button style={u.join} onClick={() => { finished.current = false; setPhase("prejoin"); prepare(); }}>Rejoin</button>
            )}
            <button style={u.ghost} onClick={() => navigate("/")}>← Back to chat</button>
          </div>
        </section>
      )}

      {error && phase !== "prejoin" && <p style={u.error}>{error}</p>}
    </div>
  );
}

const u = {
  page: { position: "fixed", inset: 0, zIndex: 3000, background: "#0b1020", color: "#fff", fontFamily: "Inter, Arial, sans-serif", display: "flex", flexDirection: "column", minHeight: 0 },
  header: { minHeight: 64, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", padding: "10px 18px", borderBottom: "1px solid #263047", background: "#111a2d" },
  brand: { display: "block", fontSize: 13, letterSpacing: 1.5 },
  roomLabel: { display: "block", color: "#93a2bd", fontSize: 12 },
  select: { border: "1px solid #46516b", borderRadius: 10, padding: "9px 10px", background: "#293752", color: "#fff", fontSize: 13 },
  ghost: { border: "1px solid #46516b", borderRadius: 10, padding: "10px 14px", background: "#293752", color: "#fff", cursor: "pointer", fontSize: 13 },
  dangerGhost: { border: "1px solid #a13a44", borderRadius: 10, padding: "10px 14px", background: "#3d2229", color: "#ff9caa", cursor: "pointer", fontSize: 13 },
  lobby: { margin: "auto", width: "min(480px, calc(100% - 32px))", boxSizing: "border-box", padding: 30, border: "1px solid #263047", borderRadius: 22, background: "#121d32", textAlign: "center" },
  logo: { margin: "0 auto 14px", width: 58, height: 58, borderRadius: 18, display: "grid", placeItems: "center", background: "#8065f5", fontSize: 28 },
  h1: { margin: "6px 0", fontSize: 24 },
  sub: { color: "#a8b4cc", fontSize: 14, lineHeight: 1.6 },
  preview: { position: "relative", margin: "18px auto", width: "100%", maxWidth: 420, aspectRatio: "16/9", borderRadius: 16, overflow: "hidden", background: "#202b42" },
  label: { display: "block", textAlign: "left", fontSize: 12, color: "#a8b4cc", margin: "10px 0 6px" },
  input: { width: "100%", boxSizing: "border-box", padding: 12, borderRadius: 10, border: "1px solid #3a4763", background: "#0e1729", color: "#fff", fontSize: 14, outline: "none" },
  join: { border: 0, borderRadius: 12, padding: "13px 26px", marginTop: 14, background: "#8065f5", color: "#fff", fontWeight: 700, cursor: "pointer" },
  backLink: { display: "block", margin: "14px auto 0", border: 0, background: "transparent", color: "#93a2bd", cursor: "pointer", fontSize: 13 },
  spinner: { width: 42, height: 42, margin: "0 auto 16px", borderRadius: "50%", border: "4px solid #2c3a57", borderTopColor: "#8065f5", animation: "suraSpin 1s linear infinite" },
  grid: { flex: 1, minHeight: 0, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))", gap: 12, padding: 14, alignContent: "center" },
  speakerWrap: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 10, padding: 14 },
  strip: { display: "flex", gap: 10, overflowX: "auto", flexShrink: 0, paddingBottom: 4 },
  stripTile: { width: 190, minWidth: 190, height: 112, flexShrink: 0 },
  tileSpot: { boxShadow: "0 0 0 2px #8065f5" },
  tile: { position: "relative", minHeight: "min(46vh, 420px)", aspectRatio: "16/9", borderRadius: 18, overflow: "hidden", background: "#202b42", cursor: "pointer" },
  video: { width: "100%", height: "100%", objectFit: "cover" },
  avatar: { position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 44, fontWeight: 800, color: "#cdd7ea", background: "linear-gradient(145deg,#2b3a58,#1a2438)" },
  audioOnly: { position: "absolute", top: 10, left: 10, padding: "5px 9px", borderRadius: 8, background: "rgba(128,101,245,.85)", fontSize: 11 },
  name: { position: "absolute", left: 12, bottom: 12, padding: "6px 10px", borderRadius: 9, background: "rgba(0,0,0,.55)", fontSize: 13 },
  knockBar: { position: "absolute", top: 76, left: "50%", transform: "translateX(-50%)", zIndex: 20, width: "min(420px, calc(100% - 24px))", background: "#182339", border: "1px solid #33415f", borderRadius: 14, padding: 10, boxShadow: "0 14px 40px rgba(0,0,0,.5)" },
  knockRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "6px 4px", fontSize: 14 },
  admit: { border: 0, borderRadius: 9, padding: "8px 14px", background: "#28b879", color: "#fff", fontWeight: 700, cursor: "pointer", marginRight: 6 },
  deny: { border: "1px solid #5b3a40", borderRadius: 9, padding: "8px 14px", background: "transparent", color: "#ff9caa", cursor: "pointer" },
  handsBar: { position: "absolute", bottom: 150, left: "50%", transform: "translateX(-50%)", zIndex: 15, background: "rgba(228,164,77,.92)", color: "#172033", padding: "7px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700 },
  reactionLayer: { position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 18 },
  reaction: { position: "absolute", bottom: 90, fontSize: 30, animation: "suraFloatUp 3s ease-out forwards" },
  reactionBar: { position: "absolute", bottom: 96, left: 14, display: "flex", gap: 6, zIndex: 19 },
  emojiBtn: { width: 38, height: 38, borderRadius: "50%", border: "1px solid #3a4763", background: "rgba(20,29,48,.85)", fontSize: 17, cursor: "pointer" },
  sidePanel: { position: "absolute", right: 12, top: 76, bottom: 96, width: "min(320px, calc(100% - 24px))", zIndex: 21, background: "#131d33", border: "1px solid #2c3a57", borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden" },
  panelHead: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: "1px solid #24304a" },
  x: { border: 0, background: "transparent", color: "#93a2bd", fontSize: 15, cursor: "pointer" },
  personRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 14px", borderBottom: "1px solid #1c2740", fontSize: 14 },
  tiny: { border: "1px solid #3a4763", borderRadius: 8, padding: "5px 9px", background: "#22304d", color: "#fff", fontSize: 12, cursor: "pointer" },
  chatFlow: { flex: 1, minHeight: 0, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 },
  chatMsg: { fontSize: 13.5, lineHeight: 1.5, overflowWrap: "anywhere" },
  controls: { display: "flex", justifyContent: "center", alignItems: "flex-end", gap: "clamp(10px, 2.5vw, 22px)", flexWrap: "wrap", padding: "12px 12px max(14px, env(safe-area-inset-bottom))", background: "#111a2d", borderTop: "1px solid #263047", zIndex: 22 },
  ctrl: { border: "1px solid #3a4763", borderRadius: 14, padding: "10px 14px", background: "#1d2a44", color: "#fff", cursor: "pointer", fontSize: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 64 },
  ctrlActive: { background: "#e4a44d", color: "#172033", borderColor: "#e4a44d" },
  leave: { border: 0, borderRadius: 14, padding: "10px 18px", background: "#d83d4e", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 },
  error: { color: "#ff9caa", textAlign: "center", padding: 10, fontSize: 13.5 },
};
