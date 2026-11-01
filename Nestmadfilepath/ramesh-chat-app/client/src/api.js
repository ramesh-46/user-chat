// Central API client for the chat application.
import axios from "axios";
import { auth } from "./firebase";

const api = axios.create({
  baseURL: "https://user-chat-9luh.onrender.com/api",
  timeout: 30000,
});

// Attach the signed-in Firebase user's ID token to protected API requests.
api.interceptors.request.use(async (config) => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    const token = await currentUser.getIdToken();
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Account and profile
export const signup = (data) => api.post("/auth/signup", data);
export const login = (data) => api.post("/auth/login", data);
export const updateProfile = (userId, data) => api.put(`/profile/${userId}`, data);
export const recoverUsername = (email) => api.get("/auth/recover/username", { params: { email } });
export const recoverEmail = (username) => api.get("/auth/recover/email", { params: { username } });
export const recoverByQuestion = (email, answer) =>
  api.get("/auth/recover/question", { params: { email, answer } });

// User lookup: username, email or mobile number.
export const findUser = (value) => {
  const normalized = String(value || "").trim();
  const params = /^\+?\d+$/.test(normalized)
    ? { mobile: normalized }
    : normalized.includes("@")
      ? { email: normalized.toLowerCase() }
      : { username: normalized.toLowerCase() };
  return api.get("/users", { params });
};

// Chat list and messages
export const fetchChatList = (userId) => api.get(`/chatlist/${userId}`);
export const fetchConversations = (userId) => api.get(`/conversations/${userId}`);
export const fetchMessages = (userId, peerId) => api.get(`/messages/${userId}/${peerId}`);
export const markConversationRead = (userId, peerId) =>
  api.post(`/messages/read/${peerId}`, { userId });
export const sendMessage = (formData) =>
  api.post("/messages", formData, { headers: { "Content-Type": "multipart/form-data" } });

// Chat settings and message actions
export const blockUser = (userId, peerId) => api.post(`/block/${userId}/${peerId}`);
export const unblockUser = (userId, peerId) => api.post(`/unblock/${userId}/${peerId}`);
export const clearHistory = (userId, peerId) => api.delete(`/settings/history/${userId}/${peerId}`);
export const deleteChat = (userId, peerId) => api.delete(`/settings/chat/${userId}/${peerId}`);
export const saveFCMToken = (userId, token) => api.post("/settings/fcmtoken", { userId, token });
export const toggleStar = (messageId, starred) => api.put(`/star/${messageId}`, { starred });
export const pinChat = (userId, peerId) => api.post(`/pin/${userId}/${peerId}`);
export const deleteDirectMessage = (messageId, forEveryone = false) =>
  api.delete(`/message-actions/${messageId}`, { params: { forEveryone } });

// Groups
export const fetchGroups = () => api.get("/groups");
export const createGroup = (data) => api.post("/groups/create", data);
export const addGroupMember = (groupId, newUserId) => api.post("/groups/add", { groupId, newUserId });
export const removeGroupMember = (groupId, removeUserId) => api.post("/groups/remove", { groupId, removeUserId });
export const promoteGroupAdmin = (groupId, userId) => api.post("/groups/admins/add", { groupId, userId });
export const demoteGroupAdmin = (groupId, userId) => api.post("/groups/admins/remove", { groupId, userId });
export const updateGroup = (groupId, data) => api.patch(`/groups/${groupId}`, data);
export const deleteGroup = (groupId) => api.delete(`/groups/${groupId}`);
export const leaveGroup = (groupId) => api.post(`/groups/${groupId}/leave`);
export const fetchGroupMessages = (groupId) => api.get(`/group-messages/${groupId}/messages`);
export const sendGroupMessage = (groupId, formData) =>
  api.post(`/group-messages/${groupId}/messages`, formData, { headers: { "Content-Type": "multipart/form-data" } });
export const deleteGroupMessage = (messageId, forEveryone = false) =>
  api.delete(`/group-messages/messages/${messageId}`, { params: { forEveryone } });
export const fetchGroupMedia = (messageId) =>
  api.get(`/group-messages/messages/${messageId}/media`, { responseType: "blob" });

export default api;
