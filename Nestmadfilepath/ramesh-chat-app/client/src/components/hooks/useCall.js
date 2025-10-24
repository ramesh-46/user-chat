import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

export function useCall(userId) {
  const socket = useRef(io("https://blackpearlbackend.onrender.com"));
  const pc = useRef(null);
  const localStream = useRef(null);
  const remoteStream = useRef(null);
  const timeoutRef = useRef(null);

  const [callState, setCallState] = useState("idle"); // idle | calling | incoming | connected
  const [incomingPeer, setIncomingPeer] = useState(null);
  const [micAllowed, setMicAllowed] = useState(false);

  /* ✅ Function to get mic permission safely */
  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStream.current = stream;
      setMicAllowed(true);
      return stream;
    } catch (err) {
      console.warn("⚠️ Microphone access denied:", err);
      setMicAllowed(false);
      alert("Microphone access is required to make or receive calls. Please allow it in browser settings and try again.");
      return null;
    }
  }, []);

  /* ✅ Create Peer Connection */
  const createPeerConnection = useCallback(() => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        socket.current.emit("ice-candidate", { userId, candidate: e.candidate });
      }
    };

    peer.ontrack = (e) => {
      remoteStream.current = e.streams[0];
      const audio = new Audio();
      audio.srcObject = remoteStream.current;
      audio.play().catch(() => {
        console.warn("⚠️ Auto-play blocked by browser, user interaction required");
      });
    };

    return peer;
  }, [userId]);

  /* ✅ Start Call */
  const call = useCallback(
    async (peerId) => {
      setCallState("calling");

      // Get microphone permission before connecting
      const stream = await getLocalStream();
      if (!stream) {
        setCallState("idle");
        return;
      }

      pc.current = createPeerConnection();
      stream.getTracks().forEach((track) => pc.current.addTrack(track, stream));

      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);

      socket.current.emit("call", { from: userId, to: peerId, offer });
    },
    [userId, getLocalStream, createPeerConnection]
  );

  /* ✅ Answer Call */
  const answer = useCallback(
    async (from, offer) => {
      setCallState("connected");
      setIncomingPeer(null);

      const stream = await getLocalStream();
      if (!stream) {
        setCallState("idle");
        return;
      }

      pc.current = createPeerConnection();
      stream.getTracks().forEach((track) => pc.current.addTrack(track, stream));

      await pc.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);

      socket.current.emit("answer", { from: userId, to: from, answer });
    },
    [userId, getLocalStream, createPeerConnection]
  );

  /* ✅ Hang up */
  const hangup = useCallback(() => {
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
    if (localStream.current) {
      localStream.current.getTracks().forEach((t) => t.stop());
      localStream.current = null;
    }
    setCallState("idle");
    socket.current.emit("hangup", { userId });
  }, [userId]);

  /* ✅ Decline incoming call */
  const decline = useCallback(
    (from) => {
      setIncomingPeer(null);
      setCallState("idle");
      socket.current.emit("decline", { from, to: userId });
    },
    [userId]
  );

  /* ✅ Mute/Unmute mic */
  const toggleMute = useCallback(() => {
    if (localStream.current) {
      const track = localStream.current.getAudioTracks()[0];
      if (track) track.enabled = !track.enabled;
    }
  }, []);

  /* ✅ Handle socket events */
  useEffect(() => {
    const s = socket.current;

    s.on("call", async ({ from, offer }) => {
      console.log("📞 Incoming call from:", from);
      setIncomingPeer({ from, offer });
      setCallState("incoming");
    });

    s.on("answer", async ({ answer }) => {
      if (pc.current) {
        await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallState("connected");
      }
    });

    s.on("ice-candidate", async ({ candidate }) => {
      if (pc.current && candidate) {
        try {
          await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("❌ ICE candidate error:", err);
        }
      }
    });

    s.on("hangup", () => {
      hangup();
    });

    s.on("decline", () => {
      setCallState("idle");
      setIncomingPeer(null);
    });

    return () => {
      s.disconnect();
      if (pc.current) pc.current.close();
    };
  }, [hangup]);

  /* ✅ Auto-Check mic permission once on mount */
  useEffect(() => {
    navigator.permissions?.query({ name: "microphone" }).then((res) => {
      if (res.state === "granted") setMicAllowed(true);
      else if (res.state === "prompt") {
        getLocalStream();
      } else {
        setMicAllowed(false);
      }
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