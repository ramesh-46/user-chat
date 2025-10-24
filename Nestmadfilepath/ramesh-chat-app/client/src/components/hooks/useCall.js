import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

export function useCall(userId) {
  const socket = useRef(null);
  const pc = useRef(null);
  const localStream = useRef(null);
  const remoteStream = useRef(null);
  const timeoutRef = useRef(null);
  const [callState, setCallState] = useState("idle"); // idle | calling | incoming | connected | ended
  const [peerId, setPeerId] = useState(null);
  const [incomingPeer, setIncomingPeer] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [micPermission, setMicPermission] = useState(null); // 'granted' | 'denied' | 'prompt'

  // Initialize socket lazily
  if (typeof window !== "undefined" && socket.current === null) {
    socket.current = io("https://blackpearlbackend.onrender.com", {
      transports: ["websocket", "polling"],
    });
  }

  const rtcCfg = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  // Helper: Stop all tracks in a stream
  const stopTracks = (stream) => {
    if (!stream) return;
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (e) {
        console.error("Error stopping track:", e);
      }
    });
  };

  // Check microphone permission state
  const checkMicPermission = async () => {
    try {
      const permissionStatus = await navigator.permissions.query({ name: "microphone" });
      setMicPermission(permissionStatus.state);
      return permissionStatus.state === "granted";
    } catch (e) {
      console.error("Permission API not supported:", e);
      return false;
    }
  };

  // Request microphone permission (with user feedback)
  const requestMicPermission = async () => {
    try {
      const hasPermission = await checkMicPermission();
      if (hasPermission) return true;
      // Request permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stopTracks(stream); // Stop the temporary stream
      setMicPermission("granted");
      return true;
    } catch (e) {
      console.error("Microphone access denied:", e);
      setMicPermission("denied");
      alert("Microphone access is required for calls. Please enable it in your browser settings.");
      return false;
    }
  };

  // Start local stream (with permission handling)
  const startLocal = async () => {
    const hasPermission = await requestMicPermission();
    if (!hasPermission) throw new Error("Microphone permission denied");
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      return localStream.current;
    } catch (err) {
      console.error("getUserMedia error:", err);
      throw new Error("Failed to access microphone");
    }
  };

  // Clean up resources
  const cleanUp = useCallback(() => {
    try {
      if (pc.current) {
        pc.current.ontrack = null;
        pc.current.onicecandidate = null;
        pc.current.onconnectionstatechange = null;
        pc.current.close();
        pc.current = null;
      }
      stopTracks(localStream.current);
      stopTracks(remoteStream.current);
      localStream.current = null;
      remoteStream.current = null;
      clearTimeout(timeoutRef.current);
      setPeerId(null);
      setIncomingPeer(null);
      setIsMuted(false);
      setCallState("idle");
    } catch (err) {
      console.error("Cleanup error:", err);
    }
  }, []);

  // Create peer connection (offer/answer/ICE)
  const createPeer = async (isCaller, remoteId, remoteOffer = null) => {
    try {
      const stream = localStream.current || (await startLocal());
      pc.current = new RTCPeerConnection(rtcCfg);
      stream.getTracks().forEach((t) => pc.current.addTrack(t, stream));

      pc.current.ontrack = ({ streams: [s] }) => {
        remoteStream.current = s;
        console.log("Remote stream received");
      };

      pc.current.onicecandidate = ({ candidate }) => {
        if (candidate && remoteId) {
          socket.current.emit("webrtc-ice", { to: remoteId, from: userId, candidate });
        }
      };

      if (remoteOffer) {
        await pc.current.setRemoteDescription(remoteOffer);
        const answer = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answer);
        socket.current.emit("webrtc-answer", {
          to: remoteId,
          from: userId,
          sdp: pc.current.localDescription,
        });
        return;
      }

      if (isCaller) {
        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);
        socket.current.emit("webrtc-offer", {
          to: remoteId,
          from: userId,
          sdp: pc.current.localDescription,
        });
      }

      pc.current.onconnectionstatechange = () => {
        if (!pc.current) return;
        const state = pc.current.connectionState;
        if (state === "disconnected" || state === "failed" || state === "closed") {
          cleanUp();
        }
      };
    } catch (err) {
      console.error("Error in createPeer:", err);
      throw err;
    }
  };

  // Answer an incoming call
  const answer = useCallback(async () => {
    if (callState !== "incoming" || !peerId) return;
    try {
      if (!localStream.current) await startLocal();
      // Create the peer connection BEFORE emitting callAccepted
      await createPeer(false, peerId);
      socket.current.emit("callAccepted", { to: peerId, from: userId });
      setCallState("connected");
    } catch (err) {
      console.error("Answer error:", err);
      setCallState("ended");
      cleanUp();
    }
  }, [callState, peerId, userId, cleanUp]);

  // Decline an incoming call
  const decline = useCallback(() => {
    if (callState !== "incoming" || !peerId) return;
    socket.current.emit("callDeclined", { to: peerId, from: userId });
    setCallState("ended");
    cleanUp();
  }, [callState, peerId, userId, cleanUp]);

  // Initiate a call
  const call = useCallback(
    async (targetId, targetUser) => {
      if (callState !== "idle") return;
      setPeerId(targetId);
      setCallState("calling");
      try {
        if (!localStream.current) await startLocal();
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
      } catch (err) {
        console.error("Call error:", err);
        setCallState("ended");
        cleanUp();
      }
    },
    [callState, userId, cleanUp]
  );

  // End the current call
  const hangup = useCallback(() => {
    if (!peerId) {
      cleanUp();
      return;
    }
    try {
      socket.current.emit("callEnded", { to: peerId, from: userId });
    } catch (e) {
      console.error("Error emitting callEnded:", e);
    }
    setCallState("ended");
    cleanUp();
  }, [peerId, userId, cleanUp]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!localStream.current) return;
    localStream.current.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
    setIsMuted((prev) => !prev);
  }, []);

  // Socket event listeners
  useEffect(() => {
    const s = socket.current;
    if (!s) return;

    s.emit("join", userId);

    s.on("incomingCall", ({ from, fromUser }) => {
      setIncomingPeer(fromUser);
      setPeerId(from);
      setCallState("incoming");
    });

    s.on("callAccepted", async ({ from }) => {
      clearTimeout(timeoutRef.current);
      try {
        // The caller should already have the peer connection created
        // But we need to handle the case where it might not be
        if (!pc.current) {
          await createPeer(true, from);
        }
        setCallState("connected");
      } catch (err) {
        console.error("Error during callAccepted:", err);
        setCallState("ended");
        cleanUp();
      }
    });

    s.on("callDeclined", ({ from }) => {
      clearTimeout(timeoutRef.current);
      setCallState("ended");
      cleanUp();
    });

    s.on("callEnded", ({ from }) => {
      clearTimeout(timeoutRef.current);
      setCallState("ended");
      cleanUp();
    });

    s.on("webrtc-offer", async ({ from, sdp }) => {
      if (!from || !sdp) return;
      setPeerId(from);
      try {
        await createPeer(false, from, new RTCSessionDescription(sdp));
      } catch (err) {
        console.error("Error handling webrtc-offer:", err);
      }
    });

    s.on("webrtc-answer", async ({ sdp }) => {
      if (!sdp || !pc.current) return;
      try {
        await pc.current.setRemoteDescription(new RTCSessionDescription(sdp));
        setCallState("connected");
      } catch (err) {
        console.error("Error setting remote description (answer):", err);
      }
    });

    s.on("webrtc-ice", async ({ candidate }) => {
      if (!candidate || !pc.current) return;
      try {
        await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("addIceCandidate error:", err);
      }
    });

    return () => {
      try {
        s.disconnect();
      } catch (e) {
        console.error("Error disconnecting socket:", e);
      }
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
    micPermission,
    requestMicPermission,
  };
}
