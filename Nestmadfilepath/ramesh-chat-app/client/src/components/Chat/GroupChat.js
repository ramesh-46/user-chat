import React, { useEffect, useMemo, useState, useContext } from "react";
import dayjs from "dayjs";
import {
  fetchGroups, createGroup, fetchGroupMessages, sendGroupMessage,
  deleteGroupMessage, fetchGroupMedia, addGroupMember, promoteGroupAdmin, demoteGroupAdmin,
  removeGroupMember, deleteGroup, leaveGroup, findUser, fetchChatList
} from "../../api";
import { AuthContext } from "../../contexts/AuthContext";
import { auth } from "../../firebase";
import socket from "../../socket";

const panel = { display: "flex", height: "100%", minHeight: 0, minWidth: 0, overflow: "hidden", background: "#F8F7FC", color: "#302B45", fontFamily: "var(--font-ui)" };
const side = { width: 300, minWidth: 230, maxWidth: "38%", minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", borderRight: "1px solid var(--border)", padding: 14, boxSizing: "border-box", background: "#FFFFFF", boxShadow: "inset -1px 0 0 #ECE8F5" };
const button = { border: 0, borderRadius: 12, padding: "10px 14px", cursor: "pointer", background: "linear-gradient(135deg, #8065F5, #6D50E8)", color: "white", margin: 3, fontWeight: 700, boxShadow: "0 5px 14px rgba(128,101,245,.2)" };
const field = { width: "100%", boxSizing: "border-box", padding: "11px 13px", margin: "6px 0", borderRadius: 12, border: "1px solid var(--border)", background: "#FFFFFF", color: "#302B45", boxShadow: "0 2px 8px rgba(55,42,110,.035)" };

export default function GroupChat({ onBack }) {
  const { user } = useContext(AuthContext);
  const [groups, setGroups] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selectedGroupMessages, setSelectedGroupMessages] = useState([]);
  const groupTouchTimer = React.useRef(null);
  const groupLongPressTriggered = React.useRef(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [memberIds, setMemberIds] = useState("");
  const [contacts, setContacts] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [mobileLayout, setMobileLayout] = useState(window.innerWidth <= 700);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [viewOnce, setViewOnce] = useState(false);
  const [adminTarget, setAdminTarget] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mediaUrls, setMediaUrls] = useState({});
  const [typingUser, setTypingUser] = useState("");
  const typingTimer = React.useRef(null);
  const mediaUrlsRef = React.useRef({});

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

  useEffect(() => { loadGroups(); fetchChatList(myId).then(res => setContacts(res.data.users || [])).catch(() => {}); }, [myId]);
  useEffect(() => { const resize = () => setMobileLayout(window.innerWidth <= 700); window.addEventListener("resize", resize); return () => window.removeEventListener("resize", resize); }, []);
  useEffect(() => {
    setSelectedGroupMessages([]);
    clearTimeout(groupTouchTimer.current);
    if (!active?._id) { setMessages([]); return; }
    let mounted = true;
    const join = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (token && mounted) socket.emit("group:join", { groupId: active._id, token });
      } catch (e) { console.error("Group socket authentication failed:", e); }
    };
    if (socket.connected) join();
    socket.on("connect", join);
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
    const onTyping = ({ groupId, from, typing }) => {
      if (String(groupId) !== String(active._id) || String(from) === myId) return;
      setTypingUser(typing ? "A member is typing…" : "");
      clearTimeout(typingTimer.current);
      if (typing) typingTimer.current = setTimeout(() => setTypingUser(""), 1800);
    };
    const onDeleted = ({ messageId }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, deletedForEveryone: true, text: "", file: null } : m));
    };
    socket.on("group:message", onMessage);
    socket.on("group:message-deleted", onDeleted);
    socket.on("group:typing", onTyping);
    return () => {
      mounted = false;
      socket.emit("group:leave", { groupId: active._id });
      socket.off("connect", join);
      socket.off("group:message", onMessage);
      socket.off("group:message-deleted", onDeleted);
      socket.off("group:typing", onTyping);
      clearTimeout(typingTimer.current);
    };
  }, [active?._id]);

  useEffect(() => () => Object.values(mediaUrlsRef.current).forEach(url => URL.revokeObjectURL(url)), []);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true); setError("");
    try {
      const entries = memberIds.split(/[ ,\n]+/).map(x => x.trim()).filter(Boolean);
      const ids = [...selectedMembers];
      for (const entry of entries) {
        if (/^[a-f0-9]{24}$/i.test(entry)) { ids.push(entry); continue; }
        const found = await findUser(entry);
        if (!found.data?.user?._id) throw new Error(`User not found: ${entry}`);
        ids.push(found.data.user._id);
      }
      if (lookupResult?._id) ids.push(String(lookupResult._id));
      const uniqueIds = [...new Set(ids.filter(id => String(id) !== myId))];
      const res = await createGroup({ name: name.trim(), memberIds: uniqueIds });
      await loadGroups();
      setActive(res.data.group);
      setCreating(false);
      setName(""); setMemberIds(""); setSelectedMembers([]); setLookupResult(null); setMemberSearch("");
    } catch (e) { setError(e.response?.data?.error || e.message || "Could not create group."); }
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
      setMessages(prev => prev.some(m => m._id === res.data.message._id) ? prev : [...prev, res.data.message]);
      setText(""); setFile(null); setViewOnce(false);
      socket.emit("group:typing", { groupId: active._id, from: myId, typing: false });
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
      mediaUrlsRef.current[message._id] = url;
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

  const toggleGroupMessage = (id) => setSelectedGroupMessages(prev =>
    prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
  );

  const deleteSelectedGroupMessages = async (forEveryone = false) => {
    const chosen = messages.filter(message => selectedGroupMessages.includes(message._id));
    const allowed = forEveryone ? chosen.filter(message => String(message.sender?._id || message.sender) === myId) : chosen;
    if (!allowed.length) { setSelectedGroupMessages([]); return; }
    if (!window.confirm(forEveryone ? "Delete selected messages for everyone?" : "Delete selected messages for you?")) return;
    try {
      await Promise.all(allowed.map(message => deleteGroupMessage(message._id, forEveryone)));
      setMessages(prev => forEveryone ? prev.map(message => allowed.some(item => item._id === message._id) ? { ...message, deletedForEveryone: true, text: "", file: null } : message) : prev.filter(message => !allowed.some(item => item._id === message._id)));
      setSelectedGroupMessages([]);
    } catch (error) { setError(error.response?.data?.error || "Unable to delete selected messages."); }
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
    <div style={{ ...panel, flexDirection: mobileLayout ? "column" : "row", overflow: "hidden" }}>
      <aside style={{ ...side, width: mobileLayout ? "100%" : 320, maxWidth: mobileLayout ? "100%" : 320, display: mobileLayout && active ? "none" : "block" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 18 }}>
          <div><div style={{ fontSize: 22, fontWeight: 800, color: "#302B45" }}>Groups</div><div style={{ fontSize: 12, color: "#918AA5", marginTop: 3 }}>Your group conversations</div></div>
          <button type="button" style={{ ...button, margin: 0, padding: "10px 13px" }} onClick={() => { setCreating(true); setActive(null); setError(""); }}>＋ Create group</button>
        </div>
        <button type="button" style={{ ...button, background: "#F2EEFF", color: "#604BC8", boxShadow: "none", border: "1px solid #E5DFFC", margin: "0 0 14px", width: "100%" }} onClick={onBack}>← Back to chats</button>
        {error && !active && <div role="alert" style={{ color: "#C34B62", background: "#FFF0F2", borderRadius: 10, padding: 10, marginBottom: 12, fontSize: 13 }}>{error}</div>}
        {creating ? (
          <form onSubmit={create} style={{ background: "#FFFFFF", border: "1px solid #ECE8F5", borderRadius: 18, padding: 16, boxShadow: "0 8px 24px rgba(55,42,110,.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><strong>Create a new group</strong><button type="button" onClick={() => { setCreating(false); setError(""); }} style={{ border: 0, background: "#F3F0FA", color: "#655B7D", borderRadius: 9, padding: "6px 10px", cursor: "pointer" }}>✕</button></div>
            <input style={field} placeholder="Group name" value={name} onChange={e => setName(e.target.value)} maxLength={100}/>
            <input style={field} placeholder="Find by username, email or mobile" value={memberSearch} onChange={e => { setMemberSearch(e.target.value); setLookupResult(null); }}/>
            <button type="button" style={{ ...button, width: "100%" }} disabled={!memberSearch.trim()} onClick={async () => { try { const result = await findUser(memberSearch.trim()); if (!result.data?.user?._id) throw new Error("No account found for that username, email or mobile number."); setLookupResult(result.data.user); setSelectedMembers(prev => [...new Set([...prev, String(result.data.user._id)])]); } catch (error) { setError(error.response?.data?.error || error.message || "User not found."); } }}>＋ Find and add person</button>
            {lookupResult && <div style={{ padding: 9, borderRadius: 10, background: "#F2EEFF", color: "#5E49C8", margin: "8px 0", fontSize: 13 }}>Added: {lookupResult.name || lookupResult.username || lookupResult.email}</div>}
            <div style={{ marginTop: 12, border: "1px solid #ECE8F5", borderRadius: 12, padding: 10, maxHeight: 230, overflowY: "auto" }}><strong style={{ fontSize: 13 }}>Select people from your chats</strong>
              {contacts.map(contact => <label key={contact._id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 2px", cursor: "pointer", borderBottom: "1px solid #F0EDF6" }}><input type="checkbox" checked={selectedMembers.includes(String(contact._id))} onChange={e => setSelectedMembers(prev => e.target.checked ? [...new Set([...prev, String(contact._id)])] : prev.filter(id => id !== String(contact._id)))}/><span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#302B45" }}>{contact.name || contact.username || contact.email || contact.mobile}</span><small style={{ marginLeft: "auto", color: "#918AA5" }}>{contact.mobile || ""}</small></label>)}
              {!contacts.length && <small style={{ color: "#918AA5" }}>No chats yet. Use the search above to add someone.</small>}
            </div>
            <div style={{ fontSize: 12, color: "#827A98", margin: "10px 0" }}>{selectedMembers.length} people selected</div>
            <button type="submit" style={{ ...button, width: "100%", padding: 12 }} disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create group"}</button>
          </form>
        ) : (
          <div><div style={{ fontSize: 12, fontWeight: 700, color: "#918AA5", letterSpacing: ".08em", textTransform: "uppercase", padding: "2px 4px 10px" }}>All groups · {groups.length}</div>
            {groups.map(g => { const selected = String(active?._id) === String(g._id); return <button type="button" key={g._id} onClick={() => { setActive(g); setCreating(false); }} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: "12px 10px", marginBottom: 6, border: selected ? "1px solid #D8CEFF" : "1px solid transparent", borderRadius: 14, background: selected ? "#F2EEFF" : "#FFFFFF", cursor: "pointer", boxShadow: selected ? "0 4px 14px rgba(128,101,245,.09)" : "none" }}>
              <span style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 15, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#EEE9FF,#DDD4FF)", color: "#7258E8", fontSize: 20 }}>👥</span><span style={{ minWidth: 0, flex: 1 }}><strong style={{ display: "block", color: "#302B45", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name || "Untitled group"}</strong><small style={{ display: "block", color: "#918AA5", marginTop: 4 }}>{g.members?.length || 0} members · {g.admins?.length || 1} admins</small></span><span style={{ color: "#A69BBE", fontSize: 19 }}>›</span>
            </button>; })}
            {!groups.length && <div style={{ textAlign: "center", padding: "42px 18px", color: "#918AA5", background: "#FFFFFF", border: "1px dashed #DDD6EC", borderRadius: 16 }}><div style={{ fontSize: 34, marginBottom: 10 }}>👥</div><strong style={{ display: "block", color: "#51486A", marginBottom: 5 }}>No groups yet</strong><span style={{ fontSize: 13 }}>Create a group to start chatting with multiple people.</span></div>}
          </div>
        )}
      </aside>
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {!active ? <div style={{ margin: "auto", opacity: .7 }}>Select a group or create a new one.</div> : <>
          <header style={{ padding: 12, borderBottom: "1px solid #EAE5F6", background: "linear-gradient(110deg,#F1EDFF,#FFFFFF 75%)" }}>
            {mobileLayout && <button type="button" onClick={() => setActive(null)} style={{ ...button, margin: "0 0 8px", padding: "7px 11px", background: "#F2EEFF", color: "#604BC8", boxShadow: "none" }}>← Groups</button>}
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
          <section style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10, background: "#F8F7FC" }}>
            {typingUser && <div style={{ fontSize: 12, opacity: .7 }}>{typingUser}</div>}
            {messages.map(m => {
              const senderId = String(m.sender?._id || m.sender);
              const mine = senderId === myId;
              const selected = selectedGroupMessages.includes(m._id);
              return <article key={m._id}
                onContextMenu={event => { event.preventDefault(); toggleGroupMessage(m._id); }}
                onTouchStart={() => { groupLongPressTriggered.current = false; groupTouchTimer.current = setTimeout(() => { groupLongPressTriggered.current = true; toggleGroupMessage(m._id); }, 550); }}
                onTouchEnd={() => clearTimeout(groupTouchTimer.current)}
                onTouchMove={() => clearTimeout(groupTouchTimer.current)}
                onClick={() => { if (groupLongPressTriggered.current) { groupLongPressTriggered.current = false; return; } if (selectedGroupMessages.length) toggleGroupMessage(m._id); }}
                style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "min(78%, 680px)", padding: "10px 13px", borderRadius: 16, background: selected ? "#DDD5FF" : mine ? "#EAE5FF" : "#FFFFFF", color: "#302B45", border: selected ? "2px solid #8065F5" : "1px solid #ECE8F5", boxShadow: "0 2px 8px rgba(15,23,42,.06)", cursor: "default", animation: "bpFadeUp .18s ease both" }}>
                <div style={{ fontSize: 11, opacity: .7 }}>{m.sender?.username || (mine ? "You" : "Member")} · {dayjs(m.createdAt).format("DD MMM, hh:mm A")}</div>
                {m.deletedForEveryone ? <i>This message was deleted</i> : <>
                  {m.text && <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.text}</div>}
                  {m.file && !m.mediaUnavailable && <div style={{ marginTop: 6 }}>
                    {mediaUrls[m._id] ? (m.fileType === "video" ? <video controls src={mediaUrls[m._id]} style={{ maxWidth: 240 }}/> : m.fileType === "audio" ? <audio controls src={mediaUrls[m._id]}/> : m.fileType === "image" ? <img src={mediaUrls[m._id]} alt="Shared media" style={{ maxWidth: 240, maxHeight: 240 }}/> : <a href={mediaUrls[m._id]} download style={{ color: "var(--primary)" }}>Download attachment</a>) :
                    <button style={button} onClick={() => openMedia(m)}>{m.viewOnce ? "👁 Open view-once media" : "Open attachment"}</button>}
                  </div>}
                  {m.mediaUnavailable && <small>Media already viewed or unavailable</small>}
                </>}

              </article>;
            })}
          </section>
          {selectedGroupMessages.length > 0 && <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#302B45", color: "#FFFFFF" }}>
            <strong style={{ marginRight: "auto" }}>{selectedGroupMessages.length} selected</strong>
            <button type="button" style={{ ...button, background: "#334155" }} onClick={() => deleteSelectedGroupMessages(false)}>Delete for me</button>
            <button type="button" style={{ ...button, background: "#B83232" }} onClick={() => deleteSelectedGroupMessages(true)}>Delete for everyone</button>
            <button type="button" style={{ ...button, background: "#475569" }} onClick={() => setSelectedGroupMessages([])}>Cancel</button>
          </div>}
          <form onSubmit={send} style={{ padding: 12, borderTop: "1px solid #ECE8F5", display: "flex", gap: 8, flexWrap: "wrap", background: "#FFFFFF" }}>
            <input style={{ ...field, flex: 1, minWidth: 120 }} placeholder="Message group…" value={text} onChange={e => { setText(e.target.value); if (active?._id) socket.emit("group:typing", { groupId: active._id, from: myId, typing: !!e.target.value }); }}/>
            <input id="group-chat-file" type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip" onChange={e => setFile(e.target.files?.[0] || null)} style={{ maxWidth: 170 }}/>
            {file && <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" checked={viewOnce} onChange={e => setViewOnce(e.target.checked)}/> View once</label>}
            <button style={button} disabled={busy || (!text.trim() && !file)}>Send</button>
          </form>
        </>}
      </main>
    </div>
  );
}
