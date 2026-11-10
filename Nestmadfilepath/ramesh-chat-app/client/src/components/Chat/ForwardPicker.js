import React, { useContext, useEffect, useState } from "react";
import { fetchChatList, fetchGroups, forwardMessages } from "../../api";
import { AuthContext } from "../../contexts/AuthContext";

export default function ForwardPicker({ messageIds, onClose }) {
  const { user } = useContext(AuthContext);
  const [chats, setChats] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const userId = String(user?._id || user?.userId || "");
  useEffect(() => {
    let alive = true;
    Promise.all([fetchChatList(userId), fetchGroups()])
      .then(([chatResponse, groupResponse]) => {
        if (!alive) return;
        setChats(chatResponse.data?.users || []);
        setGroups(Array.isArray(groupResponse.data) ? groupResponse.data : groupResponse.data?.groups || []);
      })
      .catch((err) => setError(err.response?.data?.error || "Could not load destinations."))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [userId]);
  const toggle = (type, id) => {
    const key = type + ":" + id;
    setSelected((items) => items.includes(key) ? items.filter((item) => item !== key) : [...items, key]);
  };
  const submit = async () => {
    const recipientIds = selected.filter((item) => item.startsWith("chat:")).map((item) => item.slice(5));
    const groupIds = selected.filter((item) => item.startsWith("group:")).map((item) => item.slice(6));
    if (!selected.length) return setError("Choose at least one destination.");
    setSending(true); setError("");
    try { await forwardMessages(messageIds, recipientIds, groupIds); onClose(true); }
    catch (err) { setError(err.response?.data?.error || "Forwarding failed."); }
    finally { setSending(false); }
  };
  return <div style={s.overlay} onClick={() => onClose(false)}>
    <section role="dialog" aria-modal="true" aria-label="Forward messages" style={s.panel} onClick={(event) => event.stopPropagation()}>
      <header style={s.header}><div><strong>Forward {messageIds.length} message{messageIds.length === 1 ? "" : "s"}</strong><p style={s.sub}>Choose chats or groups</p></div><button style={s.close} onClick={() => onClose(false)}>×</button></header>
      <div style={s.list}>{loading ? <p style={s.sub}>Loading destinations…</p> : <>
        {chats.map((chat) => <label key={chat._id} style={s.item}><input type="checkbox" checked={selected.includes("chat:" + chat._id)} onChange={() => toggle("chat", chat._id)} /><span>{chat.name || chat.username || chat.mobile || "Chat"}</span><small>Chat</small></label>)}
        {groups.map((group) => <label key={group._id} style={s.item}><input type="checkbox" checked={selected.includes("group:" + group._id)} onChange={() => toggle("group", group._id)} /><span>{group.name}</span><small>Group</small></label>)}
        {!chats.length && !groups.length && <p style={s.sub}>No destinations available.</p>}
      </>}</div>
      {error && <p role="alert" style={s.error}>{error}</p>}
      <footer style={s.footer}><button style={s.cancel} onClick={() => onClose(false)}>Cancel</button><button style={s.send} disabled={loading || sending || !selected.length} onClick={submit}>{sending ? "Forwarding…" : "Forward"}</button></footer>
    </section>
  </div>;
}
const s={overlay:{position:"fixed",inset:0,zIndex:15000,background:"rgba(15,12,30,.48)",display:"grid",placeItems:"center",padding:16},panel:{width:"min(460px,100%)",maxHeight:"80dvh",display:"flex",flexDirection:"column",background:"var(--surface)",color:"var(--textMain)",border:"1px solid var(--border)",borderRadius:20,boxShadow:"0 24px 80px rgba(0,0,0,.22)",overflow:"hidden"},header:{padding:"18px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid var(--border)"},sub:{margin:"5px 0 0",fontSize:12,color:"var(--textLight)"},close:{border:0,background:"transparent",fontSize:25,color:"var(--textMain)",cursor:"pointer"},list:{overflowY:"auto",padding:"8px 14px",minHeight:100},item:{display:"flex",alignItems:"center",gap:12,padding:"12px 8px",borderBottom:"1px solid var(--border)",cursor:"pointer"},footer:{display:"flex",justifyContent:"flex-end",gap:10,padding:16,borderTop:"1px solid var(--border)"},cancel:{padding:"10px 15px",borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--textMain)",cursor:"pointer"},send:{padding:"10px 18px",borderRadius:10,border:0,background:"var(--primary)",color:"#fff",fontWeight:700,cursor:"pointer"},error:{margin:"8px 18px",color:"#c33",fontSize:12}};
