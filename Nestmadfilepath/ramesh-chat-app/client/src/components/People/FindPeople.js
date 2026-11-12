import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { fetchPublicUsers } from "../../api";
const initials = (person) => (person?.name || person?.username || "?").trim().slice(0, 1).toUpperCase();
export default function FindPeople({ onPick, onBack }) {
  const { user } = useContext(AuthContext);
  const userId = String(user?._id || user?.userId || "");
  const [people, setPeople] = useState([]), [query, setQuery] = useState(""), [loading, setLoading] = useState(true), [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchPublicUsers(userId).then((r) => { if (active) setPeople(r.data?.users || []); })
      .catch((e) => { if (active) setError(e.response?.data?.error || "Could not load public profiles."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? people.filter((p) => [p.name,p.username,p.about].some((v) => String(v || "").toLowerCase().includes(term))) : people;
  }, [people, query]);
  return <section style={s.wrap}>
    <header style={s.header}><button type="button" onClick={onBack} style={s.back}>←</button><div><h2 style={s.title}>Find people</h2><p style={s.sub}>Discover public profiles and start a chat</p></div></header>
    <div style={s.search}><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, username or about" aria-label="Search public profiles" /></div>
    {loading ? <div style={s.empty}>Loading public profiles…</div> : error ? <div style={s.empty}>{error}</div> : !filtered.length ? <div style={s.empty}>{query ? "No public profiles match your search." : "No public profiles yet. People who choose Public will appear here."}</div> :
      <div style={s.list}>{filtered.map((person) => <button type="button" key={person._id} style={s.person} onClick={() => onPick(person)}>
        {person.avatar ? <img src={person.avatar.startsWith("http") ? person.avatar : "https://user-chat-9luh.onrender.com"+person.avatar} alt="" style={s.avatar} /> : <span style={s.avatarFallback}>{initials(person)}</span>}
        <span style={s.details}><b>{person.name || person.username}</b><small>@{person.username}{person.online ? " · Online" : ""}</small>{person.about ? <span>{person.about}</span> : null}</span><span style={s.chat}>Chat →</span>
      </button>)}</div>}
  </section>;
}
const s = {
 wrap:{display:"flex",flexDirection:"column",minWidth:0,width:"100%",height:"100%",background:"var(--surface)",color:"var(--textMain)"},
 header:{display:"flex",alignItems:"center",gap:12,padding:"18px 22px",borderBottom:"1px solid var(--border)"},
 back:{width:38,height:38,border:0,borderRadius:12,background:"var(--chatSelected)",color:"var(--textMain)",fontSize:20,cursor:"pointer"},
 title:{margin:0,fontSize:20},sub:{margin:"3px 0 0",color:"var(--textLight)",fontSize:12},
 search:{display:"flex",alignItems:"center",gap:9,margin:16,padding:"0 13px",border:"1px solid var(--border)",borderRadius:12,background:"var(--primarySoft)",color:"var(--textLight)"},
 list:{overflowY:"auto",padding:"0 16px 20px"},
 person:{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"13px 8px",border:0,borderBottom:"1px solid var(--border)",background:"transparent",color:"var(--textMain)",textAlign:"left",cursor:"pointer"},
 avatar:{width:46,height:46,borderRadius:"50%",objectFit:"cover",flexShrink:0},
 avatarFallback:{width:46,height:46,borderRadius:"50%",display:"grid",placeItems:"center",flexShrink:0,background:"var(--chatSelected)",color:"var(--primary)",fontWeight:800,fontSize:18},
 details:{display:"flex",flexDirection:"column",gap:3,minWidth:0,flex:1},chat:{color:"var(--primary)",fontSize:12,fontWeight:700,flexShrink:0},
 empty:{margin:"auto",padding:24,color:"var(--textLight)",textAlign:"center",fontSize:14}
};
