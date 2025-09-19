// client/src/App.js
import React, { useContext, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { AuthContext } from "./contexts/AuthContext";

import Login   from "./components/Auth/Login";
import Signup  from "./components/Auth/Signup";
import Forgot  from "./components/Auth/Forgot";
import Main    from "./components/Main";

/* 🔔  foreground push‑toast */
import { listenForeground } from "./firebase";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

export default function App() {
  const { user } = useContext(AuthContext);

  /* show toast whenever FCM arrives while tab is open */
  useEffect(() => {
    listenForeground(({ notification }) => {
      toast.info(`${notification.title}: ${notification.body}`, {
        position: "top-right",
        autoClose: 3500
      });
    });
  }, []);

  return (
    <>
      <Routes>
        {/* Home  →  chat if logged‑in, otherwise go to login */}
        <Route path="/" element={user ? <Main /> : <Navigate to="/login" />} />

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
