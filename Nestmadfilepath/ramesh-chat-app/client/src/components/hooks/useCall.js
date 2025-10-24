// useCall.js
import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

/**
 * useCall hook: handles WebRTC offer/answer/ICE and call signalling.
 *
 * Important changes:
 * - Removed restrictive signalingState checks that prevented proper
 *   offer/answer flow.
 * - Do NOT disconnect socket inside cleanup so re-calls are possible.
 * - Better error logging for addIceCandidate and setRemoteDescription.
 */

export function useCall(userId) {
  const socket = useRef(null);
  // initialize socket lazily so SSR won't crash
  if (typeof window !== "undefined" && socket.current === null) {
    socket.current = io("https://blackpearlbackend.onrender.com", { transports: ["websocket", "polling"] });
  }

  const pc = useRef(null);
  const localStream = useRef(null);
  const remoteStream = useRef(null);
  const timeoutRef = useRef(null);

  const [callState, setCallState] = useState("idle"); // idle | calling | incoming | connected | ended
  const [peerId, setPeerId] = useState(null);
  const [incomingPeer, setIncomingPeer] = useState(null);
  const [isMuted, setIsMuted] = useState(false);

  const rtcCfg = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }
      // If you need TURN for NAT traversal add TURN credentials here
    ],
  };

  const stopTracks = (stream) => {
    if (!stream) return;
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {}
    });
  };

  // NOTE: keep socket connected across calls; do not disconnect here.
  const cleanUp = useCallback(() => {
    try {
      if (pc.current) {
        try {
          pc.current.ontrack = null;
          pc.current.onicecandidate = null;
          pc.current.onconnectionstatechange = null;
          pc.current.close();
        } catch {}
        pc.current = null;
      }

      // stop tracks
      stopTracks(localStream.current);
      stopTracks(remoteStream.current);

      localStream.current = null;
      remoteStream.current = null;

      // Clear timeouts
      clearTimeout(timeoutRef.current);

      // Reset state
      setPeerId(null);
      setIncomingPeer(null);
      setIsMuted(false);
      setCallState("idle");

      // DO NOT disconnect socket here. Keep it open for future calls.
    } catch (err) {
      console.error("Cleanup error:", err);
    }
  }, []);

  const startLocal = async () => {
    try {
      // only request audio
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      return localStream.current;
    } catch (err) {
      alert("Please allow microphone access.");
      console.error("getUserMedia error:", err);
      throw new Error("Mic denied");
    }
  };

  const createPeer = async (isCaller, remoteId, remoteOffer = null) => {
    // Acquire mic (if not already)
    const stream = localStream.current || (await startLocal());

    // Create RTCPeerConnection
    pc.current = new RTCPeerConnection(rtcCfg);

    // Add local tracks
    stream.getTracks().forEach((t) => pc.current.addTrack(t, stream));

    // When remote track arrives
    pc.current.ontrack = ({ streams: [s] }) => {
      remoteStream.current = s;
      console.log("ontrack: remote stream received");
    };

    // ICE candidate -> send to remote
    pc.current.onicecandidate = ({ candidate }) => {
      if (candidate && remoteId) {
        socket.current.emit("webrtc-ice", { to: remoteId, from: userId, candidate });
        // console.log("sent ice to", remoteId);
      }
    };

    // If we were given an offer from remote, set it and create+send an answer
    if (remoteOffer) {
      try {
        await pc.current.setRemoteDescription(remoteOffer);
        console.log("setRemoteDescription (offer) success");

        const answer = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answer);
        socket.current.emit("webrtc-answer", { to: remoteId, from: userId, sdp: pc.current.localDescription });
        console.log("created & sent answer to", remoteId);
      } catch (err) {
        console.error("Error handling remote offer:", err);
      }
      // don't proceed to create offer as caller
      return;
    }

    // If caller, create offer and send
    if (isCaller) {
      try {
        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);
        socket.current.emit("webrtc-offer", { to: remoteId, from: userId, sdp: pc.current.localDescription });
        console.log("created & sent offer to", remoteId);
      } catch (err) {
        console.error("Error creating/sending offer:", err);
      }
    }

    // connection state handling
    pc.current.onconnectionstatechange = () => {
      if (!pc.current) return;
      const state = pc.current.connectionState;
      console.log("PeerConnection state:", state);
      if (state === "disconnected" || state === "failed" || state === "closed") {
        cleanUp();
      }
    };
  };

  const answer = useCallback(async () => {
    if (callState !== "incoming" || !peerId) return;
    try {
      // create peer which will handle setRemoteDescription(answer) if remoteOffer passed
      // but here we don't have offer param because offer is delivered via 'webrtc-offer' handler that already called createPeer(false, from, offer)
      // So when answering via UI, just ensure getUserMedia is ready and callAccepted is emitted
      if (!localStream.current) await startLocal();
      socket.current.emit("callAccepted", { to: peerId, from: userId });
      setCallState("connected");
      console.log("answered call — signalled callAccepted to", peerId);
    } catch (err) {
      console.error("Answer error:", err);
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
        // Ensure local stream exists early so offer creation is quick when accepted
        if (!localStream.current) await startLocal();

        socket.current.emit("call", {
          to: targetId,
          from: userId,
          fromUser: { username: targetUser?.username || "Caller" },
        });
        // fallback timeout -> auto hangup if no response
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

  const hangup = useCallback(() => {
    if (!peerId) {
      // If no peerId, still try to clean
      cleanUp();
      return;
    }
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

  // Setup socket listeners once
  useEffect(() => {
    const s = socket.current;
    if (!s) return;

    // join room/presence
    s.emit("join", userId);

    s.on("incomingCall", ({ from, fromUser }) => {
      console.log("incomingCall from", from);
      setIncomingPeer(fromUser);
      setPeerId(from);
      setCallState("incoming");
    });

    s.on("callAccepted", async ({ from }) => {
      console.log("callAccepted by", from);
      clearTimeout(timeoutRef.current);
      // create peer as caller to start offer/answer
      try {
        await createPeer(true, from);
        setCallState("connected");
      } catch (err) {
        console.error("Error during callAccepted handling:", err);
        setCallState("ended");
        cleanUp();
      }
    });

    s.on("callDeclined", ({ from }) => {
      console.log("callDeclined by", from);
      clearTimeout(timeoutRef.current);
      setCallState("ended");
      cleanUp();
    });

    s.on("callEnded", ({ from }) => {
      console.log("callEnded by", from);
      clearTimeout(timeoutRef.current);
      setCallState("ended");
      cleanUp();
    });

    s.on("webrtc-offer", async ({ from, sdp }) => {
      console.log("webrtc-offer received from", from);
      if (!from || !sdp) return;
      setPeerId(from);
      try {
        // pass the offer to createPeer which will setRemoteDescription + create answer
        await createPeer(false, from, new RTCSessionDescription(sdp));
        // after createPeer handles answer, caller will get the answer and setRemoteDescription
      } catch (err) {
        console.error("Error handling webrtc-offer:", err);
      }
    });

    s.on("webrtc-answer", async ({ sdp }) => {
      console.log("webrtc-answer received");
      if (!sdp || !pc.current) return;
      try {
        // set remote answer on caller side
        await pc.current.setRemoteDescription(new RTCSessionDescription(sdp));
        setCallState("connected");
        console.log("setRemoteDescription (answer) success");
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

    // cleanup on unmount of hook: disconnect socket and free resources
    return () => {
      try {
        s.disconnect();
      } catch {}
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