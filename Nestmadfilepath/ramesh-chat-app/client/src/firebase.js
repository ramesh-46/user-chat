import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier } from "firebase/auth";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FB_APIKEY,
  authDomain: process.env.REACT_APP_FB_AUTHDOMAIN,
  projectId: process.env.REACT_APP_FB_PROJECTID,
  storageBucket: process.env.REACT_APP_FB_STORAGEBUCKET,
  messagingSenderId: process.env.REACT_APP_FB_MESSAGINGSENDERID,
  appId: process.env.REACT_APP_FB_APPID,
};
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const VAPID_KEY = "BJgUUdp-Vq5NPwMThF5MPvcQ8LReQ1j6xZa3XfBdwclLLlpU7ISprkovH6GTp4Cr-WW_k9AguGlgP3NaJqP6IBc";
let messagingPromise;
const getMessagingIfSupported = async () => {
  if (!(await isSupported())) return null;
  if (!messagingPromise) messagingPromise = Promise.resolve(getMessaging(app));
  return messagingPromise;
};
export const getFCMToken = async (requestPermission = false) => {
  try {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;
    if (Notification.permission === "default" && requestPermission) {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return null;
    }
    if (Notification.permission !== "granted") return null;
    const messaging = await getMessagingIfSupported();
    if (!messaging) return null;
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    await navigator.serviceWorker.ready;
    return await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  } catch (error) {
    console.error("[PUSH] Unable to register this device:", error);
    return null;
  }
};
export const listenForeground = (callback) => {
  let unsubscribe = () => {};
  getMessagingIfSupported().then((messaging) => {
    if (messaging) unsubscribe = onMessage(messaging, callback);
  }).catch((error) => console.warn("[PUSH] Foreground listener unavailable:", error));
  return () => unsubscribe();
};
export const getRecaptcha = () => {
  if (!window._recaptchaVerifier) {
    window._recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
    window._recaptchaVerifier.render();
  }
  return window._recaptchaVerifier;
};
