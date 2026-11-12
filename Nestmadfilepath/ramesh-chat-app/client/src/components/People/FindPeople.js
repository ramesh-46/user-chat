import React, { useContext, useEffect, useMemo, useState, useCallback } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { fetchPublicUsers } from "../../api";

const initials = (person) => (person?.name || person?.username || "?").trim().slice(0, 1).toUpperCase();
const API_ORIGIN = "https://user-chat-9luh.onrender.com";

export default function FindPeople({ onPick, onBack }) {
  const { user } = useContext(AuthContext);
  const userId = String(user?._id || user?.userId || "");
  const [people, setPeople] = useState([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadPeople = useCallback(async (quiet = false) => {
    if (!userId) return;
    if (quiet) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const response = await fetchPublicUsers(userId);
      setPeople(response.data?.users || []);
    } catch (e) {
      setError(e.response?.data?.error || "Could not load public profiles. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => { loadPeople(); }, [loadPeople]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return people.filter((person) => {
      const matchesQuery = !term || [person.name, person.username, person.about]
        .some((value) => String(value || "").toLowerCase().includes(term));
      return matchesQuery && (filter !== "online" || person.online);
    }).sort((a, b) => Number(!!b.online) - Number(!!a.online)
      || String(a.name || a.username).localeCompare(String(b.name || b.username)));
  }, [people, query, filter]);

  const onlineCount = people.filter((person) => person.online).length;

  return (
    <section style={s.wrap}>
      <header style={s.header}>
        <button type="button" onClick={onBack} style={s.back} aria-label="Back to chats">←</button>
        <div style={s.heading}>
          <h2 style={s.title}>Find people</h2>
          <p style={s.sub}>Discover public profiles and start a conversation</p>
        </div>
        <button type="button" onClick={() => loadPeople(true)} disabled={refreshing || loading}
          style={s.refresh} aria-label="Refresh public profiles" title="Refresh">
          {refreshing ? "…" : "↻"}
        </button>
      </header>

      <div style={s.toolbar}>
        <div style={s.search}>
          <span style={s.searchHint}>DISCOVER</span>
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people by name, username or About…" aria-label="Search public profiles" style={s.searchInput} />
          {query && <button type="button" onClick={() => setQuery("")} style={s.clear} aria-label="Clear search">×</button>}
        </div>
        <div style={s.filters} role="group" aria-label="Filter public profiles">
          <button type="button" onClick={() => setFilter("all")} aria-pressed={filter === "all"}
            style={{ ...s.filter, ...(filter === "all" ? s.filterActive : {}) }}>All <span>{people.length}</span></button>
          <button type="button" onClick={() => setFilter("online")} aria-pressed={filter === "online"}
            style={{ ...s.filter, ...(filter === "online" ? s.filterActive : {}) }}>Online <span>{onlineCount}</span></button>
        </div>
      </div>

      {loading ? <div style={s.empty}>Loading public profiles…</div>
        : error ? <div style={s.empty}><p>{error}</p><button type="button" style={s.retry} onClick={() => loadPeople()}>Try again</button></div>
        : !filtered.length ? <div style={s.empty}>
          <div style={s.emptyIcon}>⌕</div>
          <b>{query ? "No matching profiles" : filter === "online" ? "Nobody is online right now" : "No people found yet"}</b>
          <p>{query ? "Try another name or username." : filter === "online" ? "Switch to All to browse every public profile." : "Public profiles appear here. Offline people are included in All."}</p>
        </div>
        : <div style={s.list}>
          <div style={s.listMeta}>{filtered.length} {filtered.length === 1 ? "person" : "people"} {filter === "online" ? "online" : "available"}{refreshing ? " · Updating…" : ""}</div>
          {filtered.map((person) => {
            const avatarUrl = person.avatar
              ? (person.avatar.startsWith("http") ? person.avatar : API_ORIGIN + person.avatar)
              : "";
            return <div key={person._id} style={s.person}>
              <span style={s.avatarWrap}>
                {avatarUrl ? <img src={avatarUrl} alt="" style={s.avatar} loading="lazy" />
                  : <span style={s.avatarFallback}>{initials(person)}</span>}
                <span style={{ ...s.presence, background: person.online ? "#22c55e" : "#9ca3af" }} />
              </span>
              <span style={s.details}>
                <b style={s.name}>{person.name || person.username}</b>
                <small style={s.username}>@{person.username} · {person.online ? "Online" : "Offline"}</small>
                {person.about ? <span style={s.about}>{person.about}</span> : <span style={s.aboutMuted}>No About added</span>}
              </span>
              <button type="button" style={s.chat} onClick={() => onPick(person)}>
                Message <span aria-hidden="true">→</span>
              </button>
            </div>;
          })}
        </div>}
    </section>
  );
}

const s = {
  wrap:{display:"flex",flexDirection:"column",minWidth:0,width:"100%",height:"100%",background:"var(--surface)",color:"var(--textMain)"},
  header:{display:"flex",alignItems:"center",gap:12,padding:"18px 22px",borderBottom:"1px solid var(--border)"},
  back:{width:38,height:38,border:0,borderRadius:12,background:"var(--chatSelected)",color:"var(--textMain)",fontSize:20,cursor:"pointer",flexShrink:0},
  heading:{minWidth:0,flex:1},title:{margin:0,fontSize:20},sub:{margin:"3px 0 0",color:"var(--textLight)",fontSize:12},
  refresh:{width:38,height:38,border:"1px solid var(--border)",borderRadius:11,background:"var(--surface)",color:"var(--primary)",fontSize:23,cursor:"pointer",flexShrink:0},
  toolbar:{padding:"18px 20px 14px",borderBottom:"1px solid var(--border)",background:"linear-gradient(180deg,var(--surface),var(--primarySoft))"},
  search:{display:"flex",alignItems:"center",gap:9,padding:"0 13px",minHeight:44,border:"1px solid var(--border)",borderRadius:12,background:"var(--primarySoft)",color:"var(--textLight)"},
  filters:{display:"flex",gap:8,marginTop:12},
  filter:{border:"1px solid var(--border)",borderRadius:999,padding:"7px 13px",background:"transparent",color:"var(--textLight)",fontSize:12,fontWeight:600,cursor:"pointer"},
  filterActive:{background:"var(--chatSelected)",borderColor:"var(--primary)",color:"var(--primary)"},
  clear:{border:0,background:"transparent",fontSize:20,color:"var(--textLight)",cursor:"pointer"},
  list:{overflowY:"auto",padding:"4px 20px 24px"},
  listMeta:{padding:"11px 5px 7px",fontSize:11,color:"var(--textLight)"},
  person:{width:"100%",display:"flex",alignItems:"center",gap:14,padding:"15px 12px",border:0,borderBottom:"1px solid var(--border)",background:"transparent",color:"var(--textMain)",textAlign:"left"},
  avatarWrap:{width:52,height:52,position:"relative",flexShrink:0},
  avatar:{width:52,height:52,borderRadius:"50%",objectFit:"cover"},
  avatarFallback:{width:52,height:52,borderRadius:"50%",display:"grid",placeItems:"center",background:"var(--chatSelected)",color:"var(--primary)",fontWeight:800,fontSize:19,border:"1px solid var(--border)"},
  presence:{position:"absolute",right:0,bottom:1,width:11,height:11,borderRadius:"50%",border:"2px solid var(--surface)"},
  details:{display:"flex",flexDirection:"column",gap:3,minWidth:0,flex:1},
  name:{fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  username:{fontSize:11,color:"var(--textLight)"},
  about:{fontSize:12,color:"var(--textMain)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%"},
  aboutMuted:{fontSize:11,color:"var(--textLight)"},
  chat:{color:"var(--primary)",fontSize:12,fontWeight:700,flexShrink:0,whiteSpace:"nowrap",border:"1px solid var(--primary)",borderRadius:999,padding:"8px 12px",background:"transparent",cursor:"pointer"},
  empty:{margin:"auto",padding:24,color:"var(--textLight)",textAlign:"center",fontSize:14},
  emptyIcon:{fontSize:36,marginBottom:10,color:"var(--primary)"},
  retry:{border:0,borderRadius:10,padding:"9px 14px",background:"var(--primary)",color:"#fff",fontWeight:700,cursor:"pointer"}
};
