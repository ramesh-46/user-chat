// client/src/App.js
import React, { useContext, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { AuthContext } from "./contexts/AuthContext";

import Login   from "./components/Auth/Login";
import Signup  from "./components/Auth/Signup";
import Forgot  from "./components/Auth/Forgot";
import Main    from "./components/Main";
import MeetingRoom from "./components/Meetings/MeetingRoom";

/* 🔔  foreground push‑toast */
import { listenForeground } from "./firebase";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

export default function App() {
  const { user } = useContext(AuthContext);

  /* show toast whenever FCM arrives while tab is open */
  useEffect(() => {
    const stop = listenForeground((payload) => {
      const data = payload?.data || {};
      const title = data.title || payload?.notification?.title || "SURA Chat";
      const body = data.body || payload?.notification?.body || "You have a new notification";
      toast.info(title + ": " + body, { position: "top-right", autoClose: 3500 });
    });
    return stop;
  }, []);

  return (
    <>
      <Routes>
        {/* Home  →  chat if logged‑in, otherwise go to login */}
        <Route path="/" element={user ? <Main /> : <Navigate to="/login" />} />
        <Route path="/meeting/:roomId" element={user ? <MeetingRoom /> : <Navigate to="/login" replace />} />

      <Route path="/login"  element={user ? <Navigate to="/" /> : <Login  />} />
<Route path="/signup" element={user ? <Navigate to="/" /> : <Signup />} />

        {/* Forgot username / email helpers */}
        <Route path="/forgot" element={<Forgot />} />
<Route path="*" element={<Navigate to="/" />} />

      </Routes>

      {/* 🍞 toast root */}
      <ToastContainer />
    </>
  );
}
