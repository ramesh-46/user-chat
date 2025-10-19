// // client/src/hooks/useCall.js
// import { useEffect, useRef, useState, useCallback } from "react";
// import { io } from "socket.io-client";

// export function useCall(userId) {
//   /* -------------------------------------------------- */
//   /* refs & state                                       */
//   /* -------------------------------------------------- */
//   const socket        = useRef(io("http://localhost:4000"));
//   const pc            = useRef(null);
//   const localStream   = useRef(null);
//   const remoteStream  = useRef(null);
//   const timeoutRef    = useRef(null);

//   const [callState, setCallState] = useState("idle"); // ↔ UI
//   const [peerId, setPeerId]       = useState(null);   // current call target

//   /* -------------------------------------------------- */
//   /* config                                             */
//   /* -------------------------------------------------- */
//   const rtcCfg = {
//     iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
//   };

//   /* -------------------------------------------------- */
//   /* helpers                                            */
//   /* -------------------------------------------------- */
// const startLocal = async () => {
//   if (
//     typeof navigator === "undefined" ||
//     !navigator.mediaDevices ||
//     !navigator.mediaDevices.getUserMedia
//   ) {
//     alert("❌ Your browser does not support audio call features. Try Chrome or Firefox over HTTPS.");
//     throw new Error("getUserMedia not supported");
//   }

//   try {
//     if (localStream.current) return localStream.current;
//     localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
//     return localStream.current;
//   } catch (error) {
//     alert("⚠️ Please allow mic access in your browser settings.");
//     throw error;
//   }
// };


//   const cleanUp = () => {
//     pc.current?.close();
//     pc.current = null;
//     clearTimeout(timeoutRef.current);
//     setCallState("idle");
//     setPeerId(null);
//   };

//   /* -------------------------------------------------- */
//   /* create peer connection                             */
//   /* -------------------------------------------------- */
//   const createPeer = async (isCaller, remoteId, remoteOffer = null) => {
//     const stream = await startLocal();

//     pc.current = new RTCPeerConnection(rtcCfg);
//     stream.getTracks().forEach(t => pc.current.addTrack(t, stream));

//     pc.current.ontrack = ({ streams: [s] }) => {
//       remoteStream.current = s;
//     };

//     pc.current.onicecandidate = ({ candidate }) => {
//       if (candidate)
//         socket.current.emit("webrtc-ice", { to: remoteId, candidate });
//     };

//     if (remoteOffer) {
//       // callee sets remote offer first
//       await pc.current.setRemoteDescription(new RTCSessionDescription(remoteOffer));
//     }

//     if (isCaller) {
//       const offer = await pc.current.createOffer();
//       await pc.current.setLocalDescription(offer);
//       socket.current.emit("webrtc-offer", {
//         to: remoteId,
//         sdp: pc.current.localDescription,
//       });
//     } else {
//       const answer = await pc.current.createAnswer();
//       await pc.current.setLocalDescription(answer);
//       socket.current.emit("webrtc-answer", {
//         to: remoteId,
//         sdp: pc.current.localDescription,
//       });
//     }
//   };

//   /* -------------------------------------------------- */
//   /* socket signalling                                  */
//   /* -------------------------------------------------- */
//   useEffect(() => {
//     const s = socket.current;
//     s.emit("register", userId); // one‑time registration with server
// s.on("call", async ({ from }) => {
//   console.log("📞 Incoming call from", from);
//   setPeerId(from);
//   setCallState("incoming");
// });


//     /* offer arrives (we are callee) */
//     s.on("webrtc-offer", async ({ from, sdp }) => {
//       setPeerId(from);
//       await createPeer(false, from, sdp);
//       setCallState("connected");
//       s.emit("callAccepted", { to: from });
//     });

//     /* answer arrives (we are caller) */
//     s.on("webrtc-answer", async ({ from, sdp }) => {
//       if (from !== peerId) return;
//       await pc.current.setRemoteDescription(new RTCSessionDescription(sdp));
//       setCallState("connected");
//       clearTimeout(timeoutRef.current);
//     });

//     /* ice candidates */
//     s.on("webrtc-ice", ({ from, candidate }) => {
//       if (!pc.current || from !== peerId) return;
//       if (pc.current.signalingState !== "closed") {
//         pc.current
//           .addIceCandidate(new RTCIceCandidate(candidate))
//           .catch(e => console.warn("🧊  ignored:", e.message));
//       }
//     });

//     /* remote hang up */
//     s.on("callEnded", ({ from }) => {
//       if (from === peerId) cleanUp();
//     });

//     return () => {
//       s.disconnect();
//     };
//   }, [peerId, userId]);

//   /* -------------------------------------------------- */
//   /* public API                                         */
//   /* -------------------------------------------------- */
//   const call = useCallback(
//     async targetId => {
//       if (callState !== "idle") return;
//       setPeerId(targetId);
//       setCallState("calling");
//       await createPeer(true, targetId);

//       /* timeout if not answered in 30 s */
//       timeoutRef.current = setTimeout(() => {
//         if (callState === "calling") hangup();
//       }, 30000);

//     socket.current.emit("call", { to: targetId, from: userId });

//     },
//     [callState]
//   );

//   const hangup = useCallback(() => {
//     socket.current.emit("callEnded", { to: peerId });
//     cleanUp();
//   }, [peerId]);

//   return {
//     /* streams */
//     getLocalStream:  () => localStream.current,
//     getRemoteStream: () => remoteStream.current,

//     /* controls */
//     call,
//     hangup,

//     /* UI state */
//     callState,
//   };
// }



import { useEffect, useRef, useState, useCallback } from "react";
import socket from "../../socket"; // use shared socket instead of creating a new one

export function useCall(userId) {
  const pc = useRef(null);
  const localStream = useRef(null);
  const remoteStream = useRef(null);
  const timeoutRef = useRef(null);

  const [callState, setCallState] = useState("idle");
  const [peerId, setPeerId] = useState(null);

  const rtcCfg = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  const startLocal = async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      alert("❌ Your browser does not support audio call features. Try Chrome or Firefox over HTTPS.");
      throw new Error("getUserMedia not supported");
    }

    try {
      const permissions = await navigator.permissions?.query({ name: "microphone" });
      if (permissions?.state === "denied") {
        alert("❌ Microphone permission is blocked. Please enable it from browser settings.");
        throw new Error("Permission denied");
      }

      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      return localStream.current;
    } catch (err) {
      alert("⚠️ Please allow microphone access in your browser.");
      throw err;
    }
  };

  const cleanUp = () => {
    try {
      pc.current?.close();
    } catch {}
    pc.current = null;
    clearTimeout(timeoutRef.current);
    setCallState("idle");
    setPeerId(null);
  };

  const createPeer = async (isCaller, remoteId, remoteOffer = null) => {
    const stream = await startLocal();

    pc.current = new RTCPeerConnection(rtcCfg);
    stream.getTracks().forEach((t) => pc.current.addTrack(t, stream));

    pc.current.ontrack = ({ streams: [s] }) => {
      remoteStream.current = s;
    };

    pc.current.onicecandidate = ({ candidate }) => {
      if (candidate)
        socket.emit("webrtc-ice", { to: remoteId, candidate });
    };

    if (remoteOffer) {
      await pc.current.setRemoteDescription(new RTCSessionDescription(remoteOffer));
    }

    if (isCaller) {
      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);
      socket.emit("webrtc-offer", {
        to: remoteId,
        sdp: pc.current.localDescription,
      });
    } else {
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);
      socket.emit("webrtc-answer", {
        to: remoteId,
        sdp: pc.current.localDescription,
      });
    }
  };

  useEffect(() => {
    const s = socket;

    s.emit("register", userId);

    s.on("call", async ({ from }) => {
      console.log("📞 Incoming call from", from);
      setPeerId(from);
      setCallState("incoming");
    });

    s.on("webrtc-offer", async ({ from, sdp }) => {
      console.log("Offer received from:", from); // debug
      try {
        setPeerId(from);
        await createPeer(false, from, sdp);
        setCallState("connected");
        s.emit("callAccepted", { to: from });
      } catch (e) {
        console.error("❌ Offer handling failed:", e);
        cleanUp();
      }
    });

    s.on("webrtc-answer", async ({ from, sdp }) => {
      console.log("Answer received from:", from); // debug
      if (from !== peerId) return;
      try {
        await pc.current.setRemoteDescription(new RTCSessionDescription(sdp));
        setCallState("connected");
        clearTimeout(timeoutRef.current);
      } catch (e) {
        console.error("❌ Answer error:", e);
        cleanUp();
      }
    });

    s.on("webrtc-ice", ({ from, candidate }) => {
      if (!pc.current || from !== peerId) return;
      if (pc.current.signalingState !== "closed") {
        pc.current
          .addIceCandidate(new RTCIceCandidate(candidate))
          .catch((e) => console.warn("🧊 ICE ignored:", e.message));
      }
    });

    s.on("callEnded", ({ from }) => {
      if (from === peerId) cleanUp();
    });

    return () => {
      s.off("call");
      s.off("webrtc-offer");
      s.off("webrtc-answer");
      s.off("webrtc-ice");
      s.off("callEnded");
    };
  }, [peerId, userId]);

  const call = useCallback(
    async (targetId) => {
      if (callState !== "idle") return;

      setPeerId(targetId);
      setCallState("calling");

      try {
        // Emit call first so callee knows to accept
        socket.emit("call", { to: targetId, from: userId });

        await createPeer(true, targetId);

        timeoutRef.current = setTimeout(() => {
          setCallState((prev) => {
            if (prev === "calling") hangup();
            return prev;
          });
        }, 30000);
      } catch (err) {
        console.error("❌ Call setup failed:", err);
        alert("Call failed. Please check mic permission or try HTTPS browser.");
        cleanUp();
      }
    },
    [callState, userId, hangup]
  );

  const hangup = useCallback(() => {
    if (peerId) socket.emit("callEnded", { to: peerId });
    cleanUp();
  }, [peerId]);

  return {
    getLocalStream: () => localStream.current,
    getRemoteStream: () => remoteStream.current,
    call,
    hangup,
    callState,
  };
}
