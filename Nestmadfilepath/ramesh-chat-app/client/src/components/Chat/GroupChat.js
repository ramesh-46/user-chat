import React, { useEffect, useMemo, useState, useContext } from "react";
import dayjs from "dayjs";
import {
  fetchGroups, createGroup, fetchGroupMessages, sendGroupMessage,
  deleteGroupMessage, fetchGroupMedia, addGroupMember, promoteGroupAdmin, demoteGroupAdmin,
  removeGroupMember, deleteGroup, leaveGroup
} from "../../api";
import { AuthContext } from "../../contexts/AuthContext";
import { auth } from "../../firebase";
import socket from "../../socket";

const panel = { display: "flex", height: "100%", minHeight: 0, background: "var(--surfaceAlt)", color: "var(--textMain)", fontFamily: "var(--font-ui)" };
const side = { width: 270, maxWidth: "38%", overflowY: "auto", borderRight: "1px solid var(--border)", padding: 12, boxSizing: "border-box" };
const button = { border: 0, borderRadius: 8, padding: "8px 10px", cursor: "pointer", background: "var(--primary)", color: "white", margin: 3 };
const field = { width: "100%", boxSizing: "border-box", padding: 9, margin: "5px 0", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surfaceAlt)", color: "var(--textMain)" };

export default function GroupChat({ onBack }) {
  const { user } = useContext(AuthContext);
  const [groups, setGroups] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState("");
  const [memberIds, setMemberIds] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [viewOnce, setViewOnce] = useState(false);
  const [adminTarget, setAdminTarget] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mediaUrls, setMediaUrls] = useState({});

  const myId = String(user?._id || user?.userId || "");
  const adminIds = useMemo(() => (active?.admins || [active?.admin]).map(x => String(x?._id || x)).filter(Boolean), [active]);
  const isAdmin = adminIds.includes(myId);

  const loadGroups = async () => {
    try {
      const res = await fetchGroups();
      const data = Array.isArray(res.data) ? res.data : res.data.groups || [];
      setGroups(data);
      if (active) {
        const fresh = data.find(g => String(g._id) === String(active._id));
        if (fresh) setActive(fresh);
        else setActive(null);
      }
    } catch (e) { setError(e.response?.data?.error || "Unable to load groups. Check login and Firebase authentication."); }
  };

  const loadMessages = async (group = active) => {
    if (!group?._id) return;
    try {
      const res = await fetchGroupMessages(group._id);
      setMessages(res.data.messages || []);
    } catch (e) { setError(e.response?.data?.error || "Unable to load group messages."); }
  };

  useEffect(() => { loadGroups(); }, []);
  useEffect(() => {
    if (!active?._id) { setMessages([]); return; }
    let mounted = true;
    const join = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (token && mounted) socket.emit("group:join", { groupId: active._id, token });
      } catch (e) { console.error("Group socket authentication failed:", e); }
    };
    join();
    loadMessages(active);
    const onMessage = (message) => {
      if (String(message.groupId) === String(active._id)) {
        setMessages(prev => prev.some(m => m._id === message._id) ? prev : [...prev, message]);
        if (String(message.sender?._id || message.sender) !== myId) {
          const audio = new Audio("/ping.mp3");
          audio.play().catch(() => {});
        }
      }
    };
    const onDeleted = ({ messageId }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, deletedForEveryone: true, text: "", file: null } : m));
    };
    socket.on("group:message", onMessage);
    socket.on("group:message-deleted", onDeleted);
    return () => {
      mounted = false;
      socket.emit("group:leave", { groupId: active._id });
      socket.off("group:message", onMessage);
      socket.off("group:message-deleted", onDeleted);
    };
  }, [active?._id]);

  useEffect(() => () => Object.values(mediaUrls).forEach(url => URL.revokeObjectURL(url)), [mediaUrls]);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true); setError("");
    try {
      const ids = memberIds.split(/[ ,\n]+/).map(x => x.trim()).filter(Boolean);
      const res = await createGroup({ name: name.trim(), memberIds: ids });
      await loadGroups();
      setActive(res.data.group);
      setName(""); setMemberIds("");
    } catch (e) { setError(e.response?.data?.error || "Could not create group."); }
    finally { setBusy(false); }
  };

  const send = async (e) => {
    e.preventDefault();
    if ((!text.trim() && !file) || !active) return;
    setBusy(true); setError("");
    try {
      const fd = new FormData();
      if (text.trim()) fd.append("text", text.trim());
      if (file) fd.append("file", file);
      if (file && viewOnce) fd.append("viewOnce", "true");
      const res = await sendGroupMessage(active._id, fd);
      setMessages(prev => [...prev, res.data.message]);
      setText(""); setFile(null); setViewOnce(false);
      const input = document.getElementById("group-chat-file");
      if (input) input.value = "";
      loadGroups();
    } catch (e) { setError(e.response?.data?.error || "Could not send message."); }
    finally { setBusy(false); }
  };

  const openMedia = async (message) => {
    try {
      if (mediaUrls[message._id]) return;
      const res = await fetchGroupMedia(message._id);
      const url = URL.createObjectURL(res.data);
      setMediaUrls(prev => ({ ...prev, [message._id]: url }));
      if (message.viewOnce) {
        setMessages(prev => prev.map(m => m._id === message._id ? { ...m, mediaUnavailable: true, file: null } : m));
      }
    } catch (e) {
      setError(e.response?.data?.error || "Media is no longer available.");
      if (e.response?.status === 410) setMessages(prev => prev.map(m => m._id === message._id ? { ...m, mediaUnavailable: true, file: null } : m));
    }
  };

  const removeMessage = async (m, forEveryone) => {
    if (!window.confirm(forEveryone ? "Delete this message for everyone?" : "Delete this message for you?")) return;
    try {
      await deleteGroupMessage(m._id, forEveryone);
      setMessages(prev => forEveryone
        ? prev.map(x => x._id === m._id ? { ...x, deletedForEveryone: true, text: "", file: null } : x)
        : prev.filter(x => x._id !== m._id));
    } catch (e) { setError(e.response?.data?.error || "Could not delete message."); }
  };

  const manageMember = async (action) => {
    if (!active || !adminTarget.trim()) return;
    try {
      if (action === "add") await addGroupMember(active._id, adminTarget.trim());
      if (action === "promote") await promoteGroupAdmin(active._id, adminTarget.trim());
      if (action === "demote") await demoteGroupAdmin(active._id, adminTarget.trim());
      if (action === "remove") await removeGroupMember(active._id, adminTarget.trim());
      setAdminTarget(""); await loadGroups();
    } catch (e) { setError(e.response?.data?.error || "Group update failed."); }
  };

  const closeGroup = async (action) => {
    if (!active) return;
    const question = action === "delete" ? "Permanently delete this group?" : "Leave this group?";
    if (!window.confirm(question)) return;
    try {
      if (action === "delete") await deleteGroup(active._id);
      else await leaveGroup(active._id);
      setActive(null); setMessages([]); await loadGroups();
    } catch (e) { setError(e.response?.data?.error || "Unable to complete group action."); }
  };

  return (
    <div style={panel}>
      <aside style={side}>
        <button style={{ ...button, background: "transparent", color: "var(--textMain)", border: "1px solid var(--border)" }} onClick={onBack}>← Back to chats</button>
        <h3>Groups</h3>
        <form onSubmit={create}>
          <input style={field} placeholder="New group name" value={name} onChange={e => setName(e.target.value)} maxLength={100}/>
          <textarea style={field} placeholder="Member user IDs (comma separated)" rows={2} value={memberIds} onChange={e => setMemberIds(e.target.value)}/>
          <button style={button} disabled={busy || !name.trim()}>Create group</button>
        </form>
        <div style={{ marginTop: 12 }}>
          {groups.map(g => <button key={g._id} onClick={() => setActive(g)} style={{ ...field, textAlign: "left", cursor: "pointer", borderColor: active?._id === g._id ? "var(--primary)" : "var(--border)" }}>
            <strong>{g.name}</strong><div style={{ fontSize: 12, opacity: .7 }}>{g.members?.length || 0} members · {g.admins?.length || 1} admins</div>
          </button>)}
          {!groups.length && <p style={{ opacity: .7 }}>No groups yet. Create one above.</p>}
        </div>
      </aside>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {!active ? <div style={{ margin: "auto", opacity: .7 }}>Select a group or create a new one.</div> : <>
          <header style={{ padding: 12, borderBottom: "1px solid var(--border)" }}>
            <strong>{active.name}</strong><div style={{ fontSize: 12, opacity: .7 }}>{active.members?.length || 0} members</div>
            {isAdmin && <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
              <input style={{ ...field, maxWidth: 220, margin: 0 }} placeholder="Member user ID" value={adminTarget} onChange={e => setAdminTarget(e.target.value)}/>
              <button style={button} onClick={() => manageMember("add")}>Add member</button>
              <button style={button} onClick={() => manageMember("promote")}>Make admin</button>
              <button style={button} onClick={() => manageMember("demote")}>Demote admin</button>
              <button style={button} onClick={() => manageMember("remove")}>Remove member</button>
              <button style={{ ...button, background: "#a33" }} onClick={() => closeGroup("delete")}>Delete group</button>
            </div>}
            {!isAdmin && <button style={button} onClick={() => closeGroup("leave")}>Leave group</button>}
          </header>
          {error && <div role="alert" style={{ color: "#c33", padding: 8 }}>{error}</div>}
          <section style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 9 }}>
            {messages.map(m => {
              const senderId = String(m.sender?._id || m.sender);
              const mine = senderId === myId;
              return <article key={m._id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%", padding: 10, borderRadius: 12, background: mine ? "var(--primarySoft)" : "var(--surface)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, opacity: .7 }}>{m.sender?.username || (mine ? "You" : "Member")} · {dayjs(m.createdAt).format("DD MMM, hh:mm A")}</div>
                {m.deletedForEveryone ? <i>This message was deleted</i> : <>
                  {m.text && <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.text}</div>}
                  {m.file && !m.mediaUnavailable && <div style={{ marginTop: 6 }}>
                    {mediaUrls[m._id] ? (m.fileType === "video" ? <video controls src={mediaUrls[m._id]} style={{ maxWidth: 240 }}/> : <img src={mediaUrls[m._id]} alt="Shared media" style={{ maxWidth: 240, maxHeight: 240 }}/>) :
                    <button style={button} onClick={() => openMedia(m)}>{m.viewOnce ? "👁 Open view-once media" : "Open media"}</button>}
                  </div>}
                  {m.mediaUnavailable && <small>Media already viewed or unavailable</small>}
                </>}
                {!m.deletedForEveryone && <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
                  <button style={{ ...button, fontSize: 11 }} onClick={() => removeMessage(m, false)}>Delete for me</button>
                  {mine && <button style={{ ...button, fontSize: 11, background: "#a33" }} onClick={() => removeMessage(m, true)}>Delete for everyone</button>}
                </div>}
              </article>;
            })}
          </section>
          <form onSubmit={send} style={{ padding: 10, borderTop: "1px solid var(--border)", display: "flex", gap: 7, flexWrap: "wrap" }}>
            <input style={{ ...field, flex: 1, minWidth: 120 }} placeholder="Message group…" value={text} onChange={e => setText(e.target.value)}/>
            <input id="group-chat-file" type="file" accept="image/*,video/mp4,video/webm,video/quicktime" onChange={e => setFile(e.target.files?.[0] || null)} style={{ maxWidth: 170 }}/>
            {file && <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" checked={viewOnce} onChange={e => setViewOnce(e.target.checked)}/> View once</label>}
            <button style={button} disabled={busy || (!text.trim() && !file)}>Send</button>
          </form>
        </>}
      </main>
    </div>
  );
}
