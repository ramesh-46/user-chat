import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

export function useCall(userId) {
  const socket = useRef(io("https://blackpearlbackend.onrender.com"));
  const pc = useRef(null);
  const localStream = useRef(null);
  const remoteStream = useRef(null);
  const timeoutRef = useRef(null);

  const [callState, setCallState] = useState("idle"); // idle, calling, incoming, connected, ended
  const [peerId, setPeerId] = useState(null);
  const [incomingPeer, setIncomingPeer] = useState(null);
  const [isMuted, setIsMuted] = useState(false);

  const rtcCfg = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

  const startLocal = async () => {
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      return localStream.current;
    } catch {
      alert("Please allow microphone access.");
      throw new Error("Mic denied");
    }
  };

  const cleanUp = () => {
    if (pc.current) pc.current.close();
    pc.current = null;
    clearTimeout(timeoutRef.current);
    setCallState("idle");
    setPeerId(null);
    setIncomingPeer(null);
    localStream.current?.getTracks().forEach(track => track.stop());
    localStream.current = null;
    remoteStream.current = null;
  };

  const createPeer = async (isCaller, remoteId, remoteOffer = null) => {
    const stream = await startLocal();
    pc.current = new RTCPeerConnection(rtcCfg);
    stream.getTracks().forEach(t => pc.current.addTrack(t, stream));
    pc.current.ontrack = ({ streams: [s] }) => (remoteStream.current = s);
    pc.current.onicecandidate = ({ candidate }) => {
      if (candidate) socket.current.emit("webrtc-ice", { to: remoteId, from: userId, candidate });
    };
    if (remoteOffer) await pc.current.setRemoteDescription(remoteOffer);
    if (isCaller) {
      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);
      socket.current.emit("webrtc-offer", { to: remoteId, from: userId, sdp: pc.current.localDescription });
    } else if (pc.current.remoteDescription) {
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);
      socket.current.emit("webrtc-answer", { to: remoteId, from: userId, sdp: pc.current.localDescription });
    }
  };

  const answer = useCallback(async () => {
    if (callState !== "incoming" || !peerId) return;
    try {
      await createPeer(false, peerId);
      socket.current.emit("callAccepted", { to: peerId, from: userId });
      setCallState("connected");
    } catch {
      setCallState("ended");
      setTimeout(cleanUp, 2000);
    }
  }, [callState, peerId, userId]);

  const decline = useCallback(() => {
    if (callState !== "incoming" || !peerId) return;
    socket.current.emit("callDeclined", { to: peerId, from: userId });
    setCallState("ended");
    setTimeout(cleanUp, 2000);
  }, [callState, peerId, userId]);

  const call = useCallback(async (targetId) => {
    if (callState !== "idle") return;
    setPeerId(targetId);
    setCallState("calling");

    try {
      await createPeer(true, targetId);
      socket.current.emit("call", { to: targetId, from: userId, fromUser: { username: "Caller" } });

      // 1 minute timeout if not answered
      timeoutRef.current = setTimeout(() => {
        setCallState("ended");
        socket.current.emit("callEnded", { to: targetId, from: userId });
        setTimeout(cleanUp, 2000);
      }, 60000);
    } catch {
      setCallState("ended");
      setTimeout(cleanUp, 2000);
    }
  }, [callState, userId]);

  const hangup = useCallback(() => {
    if (!peerId) return;
    socket.current.emit("callEnded", { to: peerId, from: userId });
    setCallState("ended");
    setTimeout(cleanUp, 2000);
  }, [peerId, userId]);

  const toggleMute = useCallback(() => {
    if (!localStream.current) return;
    localStream.current.getAudioTracks().forEach(track => track.enabled = !track.enabled);
    setIsMuted(!isMuted);
  }, [isMuted]);

  useEffect(() => {
    const s = socket.current;
    s.emit("join", userId);

    s.on("incomingCall", ({ from, fromUser }) => {
      setIncomingPeer(fromUser || { username: "Unknown" });
      setPeerId(from);
      setCallState("incoming");
    });

    s.on("callAccepted", () => {
      clearTimeout(timeoutRef.current);
      setCallState("connected");
    });

    s.on("callDeclined", () => {
      clearTimeout(timeoutRef.current);
      setCallState("ended");
      setTimeout(cleanUp, 2000);
    });

    s.on("callEnded", () => {
      clearTimeout(timeoutRef.current);
      setCallState("ended");
      setTimeout(cleanUp, 2000);
    });

    s.on("webrtc-offer", async ({ from, sdp }) => {
      if (!from || !sdp) return;
      setPeerId(from);
      await createPeer(false, from, new RTCSessionDescription(sdp));
    });

    s.on("webrtc-answer", async ({ from, sdp }) => {
      if (!from || !sdp) return;
      try {
        await pc.current.setRemoteDescription(new RTCSessionDescription(sdp));
        setCallState("connected");
      } catch {
        setCallState("ended");
        setTimeout(cleanUp, 2000);
      }
    });

    s.on("webrtc-ice", async ({ candidate }) => {
      if (!candidate || !pc.current) return;
      await pc.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    });

    return () => {
      s.disconnect();
      cleanUp();
    };
  }, [userId]);

  return {
    call,
    hangup,
    answer,
    decline,
    toggleMute,
    callState,
    incomingPeer,
    getLocalStream: () => localStream.current,
    getRemoteStream: () => remoteStream.current,
    isMuted
  };
}
