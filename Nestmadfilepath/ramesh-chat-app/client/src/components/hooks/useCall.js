import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

export function useCall(userId) {
  const socket = useRef(io("https://blackpearlbackend.onrender.com"));
  const pc = useRef(null);
  const localStream = useRef(null);
  const remoteStream = useRef(null);
  const timeoutRef = useRef(null);
  const [callState, setCallState] = useState("idle");
  const [peerId, setPeerId] = useState(null);
  const [incomingPeer, setIncomingPeer] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const rtcCfg = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

  const stopTracks = (stream) => {
    if (!stream) return;
    stream.getTracks().forEach((track) => {
      track.stop();
    });
  };

  const cleanUp = useCallback(() => {
    try {
      // Close peer connection
      if (pc.current) {
        pc.current.ontrack = null;
        pc.current.onicecandidate = null;
        pc.current.onconnectionstatechange = null;
        pc.current.close();
        pc.current = null;
      }

      // Stop all local/remote audio tracks immediately
      stopTracks(localStream.current);
      stopTracks(remoteStream.current);

      localStream.current = null;
      remoteStream.current = null;

      // Clear any pending timeouts
      clearTimeout(timeoutRef.current);

      // Reset states
      setPeerId(null);
      setIncomingPeer(null);
      setIsMuted(false);
      setCallState("idle");

      // Close socket connection gracefully
      if (socket.current && socket.current.connected) {
        socket.current.disconnect();
      }
    } catch (err) {
      console.error("Cleanup error:", err);
    }
  }, []);

  const startLocal = async () => {
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      return localStream.current;
    } catch {
      alert("Please allow microphone access.");
      throw new Error("Mic denied");
    }
  };

  const createPeer = async (isCaller, remoteId, remoteOffer = null) => {
    const stream = await startLocal();
    pc.current = new RTCPeerConnection(rtcCfg);
    stream.getTracks().forEach((t) => pc.current.addTrack(t, stream));

    pc.current.ontrack = ({ streams: [s] }) => {
      remoteStream.current = s;
    };

    pc.current.onicecandidate = ({ candidate }) => {
      if (candidate && remoteId) {
        socket.current.emit("webrtc-ice", { to: remoteId, from: userId, candidate });
      }
    };

    if (remoteOffer && pc.current.signalingState === "stable") {
      await pc.current.setRemoteDescription(remoteOffer);
    }

    if (isCaller) {
      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);
      socket.current.emit("webrtc-offer", { to: remoteId, from: userId, sdp: pc.current.localDescription });
    } else if (pc.current.remoteDescription && pc.current.signalingState === "stable") {
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);
      socket.current.emit("webrtc-answer", { to: remoteId, from: userId, sdp: pc.current.localDescription });
    }

    pc.current.onconnectionstatechange = () => {
      if (!pc.current) return;
      if (
        pc.current.connectionState === "disconnected" ||
        pc.current.connectionState === "failed" ||
        pc.current.connectionState === "closed"
      ) {
        cleanUp();
      }
    };
  };

  const answer = useCallback(async () => {
    if (callState !== "incoming" || !peerId) return;
    try {
      await createPeer(false, peerId);
      socket.current.emit("callAccepted", { to: peerId, from: userId });
      setCallState("connected");
    } catch {
      setCallState("ended");
      setTimeout(cleanUp, 1000);
    }
  }, [callState, peerId, userId, cleanUp]);

  const decline = useCallback(() => {
    if (callState !== "incoming" || !peerId) return;
    socket.current.emit("callDeclined", { to: peerId, from: userId });
    setCallState("ended");
    cleanUp();
  }, [callState, peerId, userId, cleanUp]);

  const call = useCallback(
    async (targetId, targetUser) => {
      if (callState !== "idle") return;
      setPeerId(targetId);
      setCallState("calling");
      try {
        socket.current.emit("call", {
          to: targetId,
          from: userId,
          fromUser: { username: targetUser?.username || "Caller" },
        });
        timeoutRef.current = setTimeout(() => {
          setCallState("ended");
          socket.current.emit("callEnded", { to: targetId, from: userId });
          cleanUp();
        }, 60000);
      } catch {
        setCallState("ended");
        cleanUp();
      }
    },
    [callState, userId, cleanUp]
  );

  // ✅ Enhanced hangup: closes all streams, socket, and triggers cleanup
  const hangup = useCallback(() => {
    if (!peerId) return;
    try {
      socket.current.emit("callEnded", { to: peerId, from: userId });
    } catch {}
    setCallState("ended");
    stopTracks(localStream.current);
    stopTracks(remoteStream.current);
    cleanUp();
  }, [peerId, userId, cleanUp]);

  const toggleMute = useCallback(() => {
    if (!localStream.current) return;
    localStream.current.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
    setIsMuted((prev) => !prev);
  }, []);

  useEffect(() => {
    const s = socket.current;
    s.emit("join", userId);

    s.on("incomingCall", ({ from, fromUser }) => {
      setIncomingPeer(fromUser);
      setPeerId(from);
      setCallState("incoming");
    });

    s.on("callAccepted", async ({ from }) => {
      clearTimeout(timeoutRef.current);
      setCallState("connected");
      await createPeer(true, from);
    });

    s.on("callDeclined", () => {
      clearTimeout(timeoutRef.current);
      setCallState("ended");
      cleanUp();
    });

    s.on("callEnded", () => {
      clearTimeout(timeoutRef.current);
      setCallState("ended");
      cleanUp();
    });

    s.on("webrtc-offer", async ({ from, sdp }) => {
      if (!from || !sdp) return;
      setPeerId(from);
      await createPeer(false, from, new RTCSessionDescription(sdp));
    });

    s.on("webrtc-answer", async ({ sdp }) => {
      if (!sdp || !pc.current) return;
      if (pc.current.signalingState === "stable") {
        await pc.current.setRemoteDescription(new RTCSessionDescription(sdp));
        setCallState("connected");
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
  }, [userId, cleanUp]);

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
    isMuted,
  };
}
