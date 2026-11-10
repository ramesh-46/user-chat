import React, { useEffect, useState } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { fetchChatList, fetchGroups, forwardMessages } from "../../api";
import { useContext } from "react";

export default function ForwardPicker({ messageIds, onClose, onDone }) {
  const { user } = useContext(AuthContext);
  const myId = String(user?._id || user?.userId || "");
  const [chats, setChats] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([fetchChatList(myId), fetchGroups()])
      .then(([chatResponse, groupResponse]) => {
        if (!active) return;
        setChats(chatResponse.data?.users || []);
        const data = groupResponse.data;
        setGroups(Array.isArray(data) ? data : data?.groups || []);
      })
      .catch(() => { if (active) setError("Could not load chats and groups."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [myId]);

  const toggle = (target) => setSelected(previous =>
    previous.some(item => item.type === target.type && item.id === target.id)
      ? previous.filter(item => !(item.type === target.type && item.id === target.id))
      : [...previous, target]
  );
  const submit = async () => {
    if (!selected.length || !messageIds?.length) return;
    setSending(true); setError("");
    try {
      const result = await forwardMessages({ messageIds, destinations: selected });
      onDone?.(result.data?.forwardedCount || messageIds.length);
      onClose?.();
    } catch (e) {
      setError(e.response?.data?.error || "Forwarding failed. Please try again.");
    } finally { setSending(false); }
  };

  return <div style={styles.backdrop} onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-label="Forward messages" style={styles.panel} onClick={e => e.stopPropagation()}>
      <header style={styles.header}><div><strong>Forward {messageIds.length} message{messageIds.length === 1 ? "" : "s"}</strong><small style={styles.sub}>Choose chats or groups</small></div><button onClick={onClose} style={styles.close}>×</button></header>
      {loading ? <div style={styles.loading}><span className="chat-inline-spinner"/> Loading conversations…</div> : <div style={styles.list}>
        <div style={styles.section}>CHATS</div>
        {chats.map(chat => {
          const target = { type: "user", id: String(chat._id) };
          const checked = selected.some(item => item.type === target.type && item.id === target.id);
          return <label key={"u-" + chat._id} style={styles.item}><input type="checkbox" checked={checked} onChange={() => toggle(target)}/><span>{chat.name || chat.username || chat.email || chat.mobile || "Chat"}</span><small>Chat</small></label>;
        })}
        <div style={styles.section}>GROUPS</div>
        {groups.map(group => {
          const target = { type: "group", id: String(group._id) };
          const checked = selected.some(item => item.type === target.type && item.id === target.id);
          return <label key={"g-" + group._id} style={styles.item}><input type="checkbox" checked={checked} onChange={() => toggle(target)}/><span>{group.name || "Group"}</span><small>{group.members?.length || 0} members</small></label>;
        })}
        {!chats.length && !groups.length && <p style={styles.sub}>No conversations available yet.</p>}
      </div>}
      {error && <p style={styles.error}>{error}</p>}
      <footer style={styles.footer}><span>{selected.length} selected</span><button disabled={!selected.length || sending || loading} onClick={submit} style={styles.send}>{sending ? "Forwarding…" : "Forward"}</button></footer>
    </section>
  </div>;
}
const styles = {
  backdrop: { position: "fixed", inset: 0, zIndex: 25000, background: "rgba(8,12,22,.48)", display: "grid", placeItems: "center", padding: 16 },
  panel: { width: "min(430px, 100%)", maxHeight: "min(78dvh, 650px)", display: "flex", flexDirection: "column", background: "var(--surface)", color: "var(--textMain)", border: "1px solid var(--border)", borderRadius: 18, padding: 16, boxShadow: "0 20px 60px rgba(0,0,0,.2)", fontFamily: "var(--font-ui)" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 12, borderBottom: "1px solid var(--border)" },
  sub: { display: "block", color: "var(--textLight)", fontSize: 12, marginTop: 4 },
  close: { border: 0, background: "var(--primarySoft)", color: "var(--textMain)", width: 32, height: 32, borderRadius: 9, fontSize: 21, cursor: "pointer" },
  list: { overflowY: "auto", minHeight: 100, padding: "8px 0" },
  section: { padding: "9px 4px 5px", color: "var(--textLight)", fontSize: 10, fontWeight: 800, letterSpacing: 1 },
  item: { display: "flex", alignItems: "center", gap: 10, padding: "11px 5px", borderBottom: "1px solid var(--border)", cursor: "pointer", fontSize: 13 },
  itemSpan: { minWidth: 0 },
  itemSmall: { marginLeft: "auto", color: "var(--textLight)" },
  loading: { padding: 28, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--textLight)", fontSize: 13 },
  footer: { display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid var(--border)", fontSize: 12 },
  send: { border: 0, borderRadius: 10, padding: "10px 18px", background: "var(--primary)", color: "#fff", fontWeight: 700, cursor: "pointer" },
  error: { color: "#d94354", fontSize: 12 }
};
// Keep list labels compact and adaptive.
