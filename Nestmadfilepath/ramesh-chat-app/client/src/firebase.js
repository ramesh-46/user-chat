// // client/src/firebase.js
// // -------------------------------------------------
// // Firebase bootstrap (Auth + Messaging + reCAPTCHA)
// // -------------------------------------------------
// import { initializeApp }              from "firebase/app";
// import { getAuth, RecaptchaVerifier } from "firebase/auth";
// import {
//   getMessaging,
//   getToken,
//   onMessage
// } from "firebase/messaging";

// /* 🔑 keys live in .env (already there) */
// const firebaseConfig = {
//   apiKey:            process.env.REACT_APP_FB_APIKEY,
//   authDomain:        process.env.REACT_APP_FB_AUTHDOMAIN,
//   projectId:         process.env.REACT_APP_FB_PROJECTID,
//   storageBucket:     process.env.REACT_APP_FB_STORAGEBUCKET,
//   messagingSenderId: process.env.REACT_APP_FB_MESSAGINGSENDERID,
//   appId:             process.env.REACT_APP_FB_APPID,
// };

// export const app  = initializeApp(firebaseConfig);
// export const auth = getAuth(app);
// export const msg  = getMessaging(app);

// /* ---- FCM Helpers ------------------------------------ */

// /** Request browser permission → return FCM token (or null) */
// export const getFCMToken = async () => {
//   try {
//     const permission = await Notification.requestPermission();
//     if (permission !== "granted") return null;

//     const token = await getToken(msg, {
//       vapidKey: "BJgUUdp-Vq5NPwMThF5MPvcQ8LReQ1j6xZa3XfBdwclLLlpU7ISprkovH6GTp4Cr-WW_k9AguGlgP3NaJqP6IBc"
//     });
//     return token;            // ⬅️ send this to your backend
//   } catch (err) {
//     console.error("FCM‑token error:", err);
//     return null;
//   }
// };

// /** While tab is open (foreground) */
// export const listenForeground = (cb) => {
//   onMessage(msg, payload => {
//     console.log("📨 Foreground FCM:", payload);
//     cb(payload);
//   });
// };

// /* ---- Invisible reCAPTCHA (unchanged) --------------- */
// export const getRecaptcha = () => {
//   if (!window._recaptchaVerifier) {
//     window._recaptchaVerifier = new RecaptchaVerifier(
//       auth,
//       "recaptcha-container",
//       { size: "invisible" }
//     );
//     window._recaptchaVerifier.render();
//   }
//   return window._recaptchaVerifier;
// };

// client/src/firebase.js
// -------------------------------------------------
// Firebase bootstrap (Auth + Messaging + reCAPTCHA)
// -------------------------------------------------



import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier } from "firebase/auth";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported
} from "firebase/messaging";

/* 🔑 keys live in .env (already there) */
const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FB_APIKEY,
  authDomain:        process.env.REACT_APP_FB_AUTHDOMAIN,
  projectId:         process.env.REACT_APP_FB_PROJECTID,
  storageBucket:     process.env.REACT_APP_FB_STORAGEBUCKET,
  messagingSenderId: process.env.REACT_APP_FB_MESSAGINGSENDERID,
  appId:             process.env.REACT_APP_FB_APPID,
};

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// 👉 Messaging is only initialized if supported
export let msg = null;
isSupported().then((supported) => {
  if (supported) {
    msg = getMessaging(app);
    console.log("✅ Messaging is supported and initialized.");
  } else {
    console.warn("⚠️ Firebase Messaging is not supported on this browser.");
  }
});

/* ---- FCM Helpers ------------------------------------ */

/** Request browser permission → return FCM token (or null) */
export const getFCMToken = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    if (!msg) {
      console.warn("❌ Messaging is not initialized.");
      return null;
    }

    const token = await getToken(msg, {
      vapidKey: "BJgUUdp-Vq5NPwMThF5MPvcQ8LReQ1j6xZa3XfBdwclLLlpU7ISprkovH6GTp4Cr-WW_k9AguGlgP3NaJqP6IBc"
    });
    return token; // ⬅️ send this to your backend
  } catch (err) {
    console.error("FCM‑token error:", err);
    return null;
  }
};

/** While tab is open (foreground) */
// Replace your old listenForeground with this:
export const listenForeground = (cb) => {
  isSupported().then((supported) => {
    if (!supported) {
      console.warn("❌ Messaging not supported for foreground listener.");
      return;
    }

    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      console.log("📨 Foreground FCM:", payload);
      cb(payload);
    });
  });
};


/* ---- Invisible reCAPTCHA (unchanged) --------------- */
export const getRecaptcha = () => {
  if (!window._recaptchaVerifier) {
    window._recaptchaVerifier = new RecaptchaVerifier(
      auth,
      "recaptcha-container",
      { size: "invisible" }
    );
    window._recaptchaVerifier.render();
  }
  return window._recaptchaVerifier;
};
