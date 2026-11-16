import React, { createContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";
import api from "../api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); }
    catch { return null; }
  });

  const login = data => {
    localStorage.setItem("user", JSON.stringify(data));
    setUser(data);
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("deviceSession");
    setUser(null);
    signOut(auth).catch(error => console.warn("Firebase sign-out failed", error?.code || error?.message));
  };

  // Keep this browser tied to its server-side device session. A revoked session
  // is detected within about two seconds and is also checked after page reload.
  useEffect(() => {
    if (!user) return undefined;
    let alive = true;
    let checking = false;
    let forcedLogout = false;
    let timer = null;

    const clearLocalSession = async () => {
      if (forcedLogout) return;
      forcedLogout = true;
      if (timer) clearInterval(timer);
      localStorage.removeItem("user");
      localStorage.removeItem("deviceSession");
      if (alive) setUser(null);
      try { await signOut(auth); }
      catch (error) { console.warn("Remote device sign-out failed", error?.code || error?.message); }
    };

    const validateDevice = async () => {
      if (!alive || checking || forcedLogout) return;
      checking = true;
      try {
        if (!localStorage.getItem("deviceSession")) {
          const registered = await api.post("/auth-extra/session/register", {
            deviceName: /Mobi/i.test(navigator.userAgent) ? "Mobile device" : "Desktop browser",
            userAgent: navigator.userAgent
          });
          if (!registered.data?.sessionToken) throw new Error("Device session registration failed");
          localStorage.setItem("deviceSession", registered.data.sessionToken);
        }
        await api.post("/auth-extra/session/check");
      } catch (error) {
        const status = error?.response?.status;
        const code = error?.response?.data?.code;
        if (status === 401 || status === 403 || code === "DEVICE_SESSION_REVOKED" || code === "DEVICE_SESSION_MISSING") {
          await clearLocalSession();
        }
        // Network/server errors are temporary; keep the session and retry.
      } finally {
        checking = false;
      }
    };

    const unsubscribe = onAuthStateChanged(auth, firebaseUser => {
      if (!alive) return;
      if (!firebaseUser) {
        if (timer) clearInterval(timer);
        localStorage.removeItem("user");
        localStorage.removeItem("deviceSession");
        setUser(null);
        return;
      }
      validateDevice();
      if (!timer) timer = setInterval(validateDevice, 2000);
    });

    return () => {
      alive = false;
      if (timer) clearInterval(timer);
      unsubscribe();
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
