import { useCallback, useEffect, useRef, useState } from "react";
import socket from "../../socket";

const RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 8,
};

export function useCall(userId) {
  const pc = useRef(null);
  const localStream = useRef(null);
  const remoteStream = useRef(null);
  const pendingOffer = useRef(null);
  const pendingIce = useRef([]);
  const timeoutRef = useRef(null);
  const recorder = useRef(null);
  const recordingRequestPending = useRef(false);
  const recordedChunks = useRef([]);
  const [callState, setCallState] = useState("idle");
  const [peerId, setPeerId] = useState(null);
  const [incomingPeer, setIncomingPeer] = useState(null);
  const [mediaMode, setMediaMode] = useState("audio");
  const [localVersion, setLocalVersion] = useState(0);
  const [remoteVersion, setRemoteVersion] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [cameraFacing, setCameraFacing] = useState("user");
  const [recording, setRecording] = useState(false);
  const [recordingRequest, setRecordingRequest] = useState(null);

  const getLocalStream = useCallback(() => localStream.current, []);
  const getRemoteStream = useCallback(() => remoteStream.current, []);

  const stopTracks = useCallback((stream) => {
    stream?.getTracks?.().forEach((track) => {
      try { track.stop(); } catch (_) {}
    });
  }, []);

  const cleanup = useCallback(() => {
    clearTimeout(timeoutRef.current);
    if (recorder.current && recorder.current.state !== "inactive") {
      try { recorder.current.stop(); } catch (_) {}
    }
    recorder.current = null;
    setRecording(false);
    setRecordingRequest(null);
    recordingRequestPending.current = false;
    if (pc.current) {
      pc.current.ontrack = null;
      pc.current.onicecandidate = null;
      pc.current.onconnectionstatechange = null;
      pc.current.close();
      pc.current = null;
    }
    stopTracks(localStream.current);
    localStream.current = null;
    remoteStream.current = null;
    pendingOffer.current = null;
    pendingIce.current = [];
    setLocalVersion((v) => v + 1);
    setRemoteVersion((v) => v + 1);
    setPeerId(null);
    setIncomingPeer(null);
    setIsMuted(false);
    setCameraEnabled(true);
    setCallState("idle");
  }, [stopTracks]);

  const acquireMedia = useCallback(async (mode) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Calls require HTTPS and a browser that supports camera/microphone access.");
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mode === "video" ? { facingMode: cameraFacing } : false,
    });
    localStream.current = stream;
    setLocalVersion((v) => v + 1);
    return stream;
  }, [cameraFacing]);

  const createPeer = useCallback((targetId, offer = null) => {
    const connection = new RTCPeerConnection(RTC_CONFIG);
    pc.current = connection;
    const stream = localStream.current;
    stream?.getTracks().forEach((track) => connection.addTrack(track, stream));
    connection.ontrack = (event) => {
      const incoming = event.streams?.[0];
      if (incoming) remoteStream.current = incoming;
      else {
        if (!remoteStream.current) remoteStream.current = new MediaStream();
        remoteStream.current.addTrack(event.track);
      }
      setRemoteVersion((v) => v + 1);
    };
    connection.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit("webrtc-ice", { to: targetId, from: userId, candidate });
    };
    connection.onconnectionstatechange = () => {
      if (["failed", "closed"].includes(connection.connectionState)) cleanup();
      if (connection.connectionState === "connected") {
        clearTimeout(timeoutRef.current);
        setCallState("connected");
      }
    };
    return (async () => {
      if (offer) {
        await connection.setRemoteDescription(new RTCSessionDescription(offer));
        for (const candidate of pendingIce.current.splice(0)) {
          try { await connection.addIceCandidate(new RTCIceCandidate(candidate)); } catch (_) {}
        }
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        socket.emit("webrtc-answer", { to: targetId, from: userId, sdp: connection.localDescription });
      } else {
        const created = await connection.createOffer();
        await connection.setLocalDescription(created);
        socket.emit("webrtc-offer", { to: targetId, from: userId, sdp: connection.localDescription });
      }
    })();
  }, [cleanup, userId]);

  const call = useCallback(async (targetId, targetUser, mode = "audio") => {
    if (!targetId || callState !== "idle") return;
    try {
      setPeerId(String(targetId));
      setMediaMode(mode);
      setCallState("calling");
      await acquireMedia(mode);
      socket.emit("call", {
        to: String(targetId),
        from: String(userId),
        mediaMode: mode,
        fromUser: { username: targetUser?.username || targetUser?.name || "Caller", avatar: targetUser?.avatar || "" },
      });
      await createPeer(String(targetId));
      timeoutRef.current = setTimeout(() => {
        socket.emit("callEnded", { to: String(targetId), from: String(userId) });
        cleanup();
      }, 60000);
    } catch (error) {
      console.error("Unable to start call:", error);
      cleanup();
      window.alert(error.message || "Unable to start the call. Check camera/microphone permissions.");
    }
  }, [acquireMedia, callState, cleanup, createPeer, userId]);

  const answer = useCallback(async () => {
    if (callState !== "incoming" || !peerId) return;
    try {
      await acquireMedia(mediaMode);
      if (!pendingOffer.current) throw new Error("The caller's connection offer has not arrived yet. Please try again.");
      await createPeer(peerId, pendingOffer.current);
      pendingOffer.current = null;
      socket.emit("callAccepted", { to: peerId, from: String(userId) });
      setCallState("connected");
    } catch (error) {
      console.error("Unable to answer call:", error);
      window.alert(error.message || "Could not answer the call.");
      socket.emit("callDeclined", { to: peerId, from: String(userId) });
      cleanup();
    }
  }, [acquireMedia, callState, cleanup, createPeer, mediaMode, peerId, userId]);

  const decline = useCallback(() => {
    if (peerId) socket.emit("callDeclined", { to: peerId, from: String(userId) });
    cleanup();
  }, [cleanup, peerId, userId]);

  const hangup = useCallback(() => {
    if (peerId) socket.emit("callEnded", { to: peerId, from: String(userId) });
    cleanup();
  }, [cleanup, peerId, userId]);

  const toggleMute = useCallback(() => {
    const tracks = localStream.current?.getAudioTracks() || [];
    if (!tracks.length) return;
    const next = !isMuted;
    tracks.forEach((track) => { track.enabled = !next; });
    setIsMuted(next);
  }, [isMuted]);

  const toggleCamera = useCallback(() => {
    const tracks = localStream.current?.getVideoTracks() || [];
    if (!tracks.length) return;
    const next = !cameraEnabled;
    tracks.forEach((track) => { track.enabled = next; });
    setCameraEnabled(next);
  }, [cameraEnabled]);

  const switchCamera = useCallback(async () => {
    if (mediaMode !== "video" || !localStream.current) return;
    const nextFacing = cameraFacing === "user" ? "environment" : "user";
    let replacement;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: nextFacing } }, audio: false });
      replacement = stream.getVideoTracks()[0];
      if (!replacement) throw new Error("No camera available");
      const sender = pc.current?.getSenders().find((item) => item.track?.kind === "video");
      if (sender) await sender.replaceTrack(replacement);
      const previous = localStream.current.getVideoTracks()[0];
      if (previous) {
        localStream.current.removeTrack(previous);
        previous.stop();
      }
      localStream.current.addTrack(replacement);
      setCameraFacing(nextFacing);
      setLocalVersion((v) => v + 1);
    } catch (error) {
      stopTracks(replacement ? new MediaStream([replacement]) : null);
      window.alert("Unable to switch camera on this device.");
    }
  }, [cameraFacing, mediaMode, stopTracks]);

  const startRecording = useCallback(() => {
    if (!localStream.current) return;
    const tracks = [
      ...(localStream.current?.getTracks() || []),
      ...(remoteStream.current?.getTracks() || []),
    ];
    if (!tracks.length || !window.MediaRecorder) {
      window.alert("Recording is not supported by this browser.");
      return;
    }
    try {
      const combined = new MediaStream(tracks);
      const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
      const instance = new MediaRecorder(combined, mimeType ? { mimeType } : undefined);
      recordedChunks.current = [];
      instance.ondataavailable = (event) => { if (event.data?.size) recordedChunks.current.push(event.data); };
      instance.onstop = () => {
        if (!recordedChunks.current.length) return;
        const blob = new Blob(recordedChunks.current, { type: instance.mimeType || "video/webm" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `call-recording-${Date.now()}.webm`;
        link.click();
        URL.revokeObjectURL(url);
        recordedChunks.current = [];
      };
      instance.start(1000);
      recorder.current = instance;
      setRecording(true);
    } catch (error) {
      window.alert("Could not start recording in this browser.");
    }
  }, []);

  const requestRecording = useCallback(() => {
    if (!peerId) return;
    socket.emit("recording:request", { to: peerId, from: String(userId) });
  }, [peerId, userId]);

  const acceptRecording = useCallback((accepted) => {
    if (!recordingRequest) return;
    socket.emit("recording:consent", { to: recordingRequest.from, from: String(userId), accepted });
    setRecordingRequest(null);
  }, [recordingRequest, userId]);

  const stopRecording = useCallback(() => {
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    recorder.current = null;
    setRecording(false);
    setRecordingConsent(false);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const join = () => {
      // Main.js authenticates the shared socket room; do not create or disconnect another socket here.
    };
    const onIncoming = ({ from, fromUser, mediaMode: mode }) => {
      setPeerId(String(from));
      setIncomingPeer(fromUser || {});
      setMediaMode(mode === "video" ? "video" : "audio");
      setCallState("incoming");
    };
    const onOffer = async ({ from, sdp }) => {
      if (!from || !sdp) return;
      if (!pc.current) pendingOffer.current = sdp;
    };
    const onAnswer = async ({ sdp }) => {
      if (!sdp || !pc.current) return;
      try {
        await pc.current.setRemoteDescription(new RTCSessionDescription(sdp));
        clearTimeout(timeoutRef.current);
        for (const candidate of pendingIce.current.splice(0)) {
          try { await pc.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch (_) {}
        }
        setCallState("connected");
      } catch (error) { console.error("Call answer negotiation failed:", error); cleanup(); }
    };
    const onIce = async ({ candidate }) => {
      if (!candidate) return;
      if (!pc.current || !pc.current.remoteDescription) { pendingIce.current.push(candidate); return; }
      try { await pc.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch (error) { console.warn("ICE candidate rejected:", error); }
    };
    const onEnded = () => cleanup();
    const onRecordingRequest = ({ from }) => setRecordingRequest({ from });
    const onRecordingConsent = ({ from, accepted }) => {
      if (!recordingRequestPending.current || String(from) !== String(peerId)) return;
      recordingRequestPending.current = false;
      if (!accepted) { window.alert("The other participant did not consent to recording."); return; }
      startRecording();
    };
    socket.on("incomingCall", onIncoming);
    socket.on("webrtc-offer", onOffer);
    socket.on("webrtc-answer", onAnswer);
    socket.on("webrtc-ice", onIce);
    socket.on("callEnded", onEnded);
    socket.on("callDeclined", onEnded);
    socket.on("recording:request", onRecordingRequest);
    socket.on("recording:consent", onRecordingConsent);
    return () => {
      socket.off("incomingCall", onIncoming);
      socket.off("webrtc-offer", onOffer);
      socket.off("webrtc-answer", onAnswer);
      socket.off("webrtc-ice", onIce);
      socket.off("callEnded", onEnded);
      socket.off("callDeclined", onEnded);
      socket.off("recording:request", onRecordingRequest);
      socket.off("recording:consent", onRecordingConsent);
    };
  }, [cleanup, peerId, startRecording, userId]);


  return {
    call, hangup, answer, decline, toggleMute, toggleCamera, switchCamera,
    requestRecording, acceptRecording, stopRecording,
    callState, incomingPeer, mediaMode, isMuted, cameraEnabled, recording,
    recordingRequest, getLocalStream, getRemoteStream, localVersion, remoteVersion,
  };
}
