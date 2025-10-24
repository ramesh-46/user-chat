import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

/**
 * Stable WebRTC + microphone-safe hook
 * Works both caller and receiver, prevents blank white screen
 */
export function useCall(userId) {
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  const [callState, setCallState] = useState("idle"); // idle | calling | incoming | connected
  const [incomingPeer, setIncomingPeer] = useState(null);
  const [micAllowed, setMicAllowed] = useState(false);

  // ✅ Initialize socket safely
  useEffect(() => {
    socketRef.current = io("https://blackpearlbackend.onrender.com", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ✅ Get microphone access safely
  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setMicAllowed(true);
      return stream;
    } catch (err) {
      console.error("Microphone permission error:", err);
      setMicAllowed(false);
      alert(
        "Please allow microphone access in your browser settings and try again."
      );
      return null;
    }
  }, []);

  // ✅ Create peer connection
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("ice-candidate", {
          userId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0];
      const audio = new Audio();
      audio.srcObject = remoteStreamRef.current;
      audio.play().catch(() =>
        console.warn("Autoplay blocked, user gesture needed")
      );
    };

    return pc;
  }, [userId]);

  // ✅ Start call
  const call = useCallback(
    async (peerId) => {
      setCallState("calling");

      const stream = await getLocalStream();
      if (!stream) {
        setCallState("idle");
        return;
      }

      pcRef.current = createPeerConnection();
      stream.getTracks().forEach((t) => pcRef.current.addTrack(t, stream));

      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);

      socketRef.current?.emit("call", { from: userId, to: peerId, offer });
    },
    [createPeerConnection, getLocalStream, userId]
  );

  // ✅ Answer call
  const answer = useCallback(
    async (from, offer) => {
      setCallState("connected");
      setIncomingPeer(null);

      const stream = await getLocalStream();
      if (!stream) {
        setCallState("idle");
        return;
      }

      pcRef.current = createPeerConnection();
      stream.getTracks().forEach((t) => pcRef.current.addTrack(t, stream));

      await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);

      socketRef.current?.emit("answer", { from: userId, to: from, answer });
    },
    [createPeerConnection, getLocalStream, userId]
  );

  // ✅ Hang up
  const hangup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setCallState("idle");
    socketRef.current?.emit("hangup", { userId });
  }, [userId]);

  // ✅ Decline
  const decline = useCallback(
    (from) => {
      setIncomingPeer(null);
      setCallState("idle");
      socketRef.current?.emit("decline", { from, to: userId });
    },
    [userId]
  );

  // ✅ Mute toggle
  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks?.()[0];
    if (track) track.enabled = !track.enabled;
  }, []);

  // ✅ Socket listeners
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on("call", ({ from, offer }) => {
      console.log("Incoming call from", from);
      setIncomingPeer({ from, offer });
      setCallState("incoming");
    });

    socket.on("answer", async ({ answer }) => {
      if (pcRef.current && answer) {
        await pcRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
        setCallState("connected");
      }
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      if (pcRef.current && candidate) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("ICE candidate error:", err);
        }
      }
    });

    socket.on("hangup", hangup);
    socket.on("decline", () => {
      setCallState("idle");
      setIncomingPeer(null);
    });

    return () => {
      socket.off("call");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("hangup");
      socket.off("decline");
    };
  }, [hangup]);

  // ✅ Check mic permission once
  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions
      .query({ name: "microphone" })
      .then((status) => {
        if (status.state === "granted") {
          setMicAllowed(true);
        } else if (status.state === "prompt") {
          getLocalStream();
        } else {
          setMicAllowed(false);
        }
      })
      .catch(() => {
        // Fallback for browsers not supporting permissions API
        getLocalStream();
      });
  }, [getLocalStream]);

  return {
    call,
    answer,
    decline,
    hangup,
    toggleMute,
    callState,
    incomingPeer,
    micAllowed,
    getLocalStream,
  };
}