// // client/src/api.js — single source of API calls
// import axios from "axios";
import { auth } from "./firebase";

// // --------------------------------------------------
// // ✅ Central Axios instance
// // --------------------------------------------------
// const api = axios.create({ baseURL: "/api" });

// // --------------------------------------------------
// // 🛡️  Chat‑settings helpers
// // --------------------------------------------------
// export const blockUser    = (me, target) => api.post("/settings/block",   { me, target });
// export const unblockUser  = (me, target) => api.post("/settings/unblock", { me, target });
// export const clearHistory = (me, peer)   => api.delete(`/settings/history/${me}/${peer}`);
// export const deleteChat   = (me, peer)   => api.delete(`/settings/chat/${me}/${peer}`);
// export const saveFCMToken = (userId, token) => api.post("/settings/fcmtoken", { userId, token });

// // --------------------------------------------------
// // ✨ Message helpers (star / pin)
// // --------------------------------------------------
// export const toggleStar = (msgId, starred) => api.put(`/star/${msgId}`, { starred });
// export const pinChat    = (meId, peerId)   => api.post(`/pin/${meId}/${peerId}`);

// // --------------------------------------------------
// // 📋 Chat list & conversations
// // --------------------------------------------------
// export const fetchChatList     = userId => api.get(`/chatlist/${userId}`);
// export const fetchConversations= userId => api.get(`/conversations/${userId}`);

// // --------------------------------------------------
// // 📨 Messages CRUD
// // --------------------------------------------------
// export const fetchMessages = (u1, u2) => api.get(`/messages/${u1}/${u2}`);
export const markConversationRead = (userId, peerId) => api.post(`/messages/read/${peerId}`, { userId });
// export const sendMessage   = formData  => api.post("/messages", formData, {
//   headers: { "Content-Type": "multipart/form-data" }
// });
// export const recoverByQuestion = (email, answer) =>
//   api.get("/auth/recover/question", {
//     params: { email, answer }
//   });

// // --------------------------------------------------
// // 👤 Auth & profile
// // --------------------------------------------------
// export const signup  = data => api.post("/auth/signup", data);
// export const login   = data => api.post("/auth/login",  data);

// export const recoverUsername = email  => api.get("/auth/recover/username", { params: { email } });
// export const recoverEmail    = uname  => api.get("/auth/recover/email",    { params: { username: uname } });

// export const updateProfile = (userId, data) => api.put(`/profile/${userId}`, data);

// const BASE = "http://localhost:4000/api";

// export const fetchGroups = async userId =>
//   await axios.get(`${BASE}/groups/${userId}`);

// // --------------------------------------------------
// // 🔎 User lookup (by mobile or username)
// // --------------------------------------------------
export const findUser = value => {
  const normalized = String(value || "").trim();
  const params = /^(?:\+?\d+)$/.test(normalized)
    ? { mobile: normalized }
    : normalized.includes("@")
      ? { email: normalized.toLowerCase() }
      : { username: normalized.toLowerCase() };
  return api.get("/users", { params });
};

export default api;



