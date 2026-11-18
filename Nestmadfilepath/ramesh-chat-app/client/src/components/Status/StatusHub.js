import React, { useEffect, useRef, useState } from "react";
import api from "../../api";

const timeLeft = date => {
  const ms = Math.max(0, new Date(date).getTime() - Date.now());
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return h + "h " + m + "m left";
};

export default function StatusHub({ onBack }) {
  const [data, setData] = useState({ mine: [], contacts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [text, setText] = useState("");
  const [type, setType] = useState("image");
  const [privacy, setPrivacy] = useState("contacts");
  const [privacyIds, setPrivacyIds] = useState("");
  const [viewerList, setViewerList] = useState(null);
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 820);
  const inputRef = useRef(null);

  useEffect(() => {
    const resize = () => setIsMobile(window.innerWidth <= 820);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const load = async () => {
    try { const r = await api.get("/statuses"); setData(r.data); setError(""); }
    catch (e) { setError(e.response?.data?.error || "Could not load statuses."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const chooseFile = e => {
    const next = e.target.files?.[0];
    if (!next) return;
    const isVideo = next.type.startsWith("video/");
    if (!next.type.startsWith("image/") && !isVideo) { setError("Choose an image or video."); return; }
    if (next.size > 100 * 1024 * 1024) { setError("Maximum media size is 100 MB."); return; }
    setFile(next); setType(isVideo ? "video" : "image"); setError("");
  };
  const post = async () => {
    setBusy(true); setError("");
    try {
      const form = new FormData();
      form.append("type", type); form.append("text", text); form.append("caption", caption);
      form.append("privacy", privacy);
      const ids = privacyIds.split(",").map(x => x.trim()).filter(Boolean);
      form.append("excludedUsers", JSON.stringify(privacy === "except" ? ids : []));
      form.append("allowedUsers", JSON.stringify(privacy === "only" ? ids : []));
      if (file) form.append("media", file);
      await api.post("/statuses", form, { headers: { "Content-Type": "multipart/form-data" } });
      setFile(null); setText(""); setCaption(""); setPrivacyIds(""); setType("image");
      await load();
    } catch (e) { setError(e.response?.data?.error || "Upload failed. Please retry."); }
    finally { setBusy(false); }
  };
  const openStatus = async status => {
    setActive(status);
    try { if (String(status.owner?._id || status.owner) !== String(data.me || "")) await api.post("/statuses/" + status._id + "/view"); } catch (_) {}
  };
  const deleteStatus = async id => {
    if (!window.confirm("Delete this status?")) return;
    try { await api.delete("/statuses/" + id); setActive(null); await load(); }
    catch (e) { setError(e.response?.data?.error || "Could not delete status."); }
  };
  const showViewers = async id => {
    try { const r = await api.get("/statuses/" + id + "/viewers"); setViewerList(r.data.viewers); }
    catch (e) { setError(e.response?.data?.error || "Could not load viewers."); }
  };

  return <div style={s.page}>
    <header style={s.header}><button style={s.back} onClick={onBack}>‹</button><div><b>Status</b><small>Share a moment · disappears after 24 hours</small></div><button style={s.refresh} onClick={load}>↻</button></header>
    {error && <div style={s.error}>{error}</div>}
    <div style={{ ...s.body, gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "minmax(0, 1fr) minmax(0, 1fr)", padding: isMobile ? 12 : 22 }}>
      <section style={s.composer}>
        <h3>Create a status</h3>
        <div style={s.tabs}><button style={type==="image"?s.selected:{}} onClick={()=>{setType("image");inputRef.current?.click();}}>Photo</button><button style={type==="video"?s.selected:{}} onClick={()=>{setType("video");inputRef.current?.click();}}>Video</button><button style={type==="text"?s.selected:{}} onClick={()=>{setType("text");setFile(null);}}>Text</button></div>
        <input ref={inputRef} type="file" accept="image/*,video/*" hidden onChange={chooseFile}/>
        {type==="text" ? <textarea value={text} onChange={e=>setText(e.target.value)} maxLength={700} placeholder="What's on your mind?" style={s.textarea}/> :
          <button style={s.pick} onClick={()=>inputRef.current?.click()}>{preview ? "Change media" : "＋ Choose photo or video"}</button>}
        {preview && <div style={s.crop}><div style={s.cropLabel}>Preview · drag-free crop frame</div>{type==="video"?<video src={preview} controls style={s.media}/>:<img src={preview} alt="Status crop preview" style={s.media}/>}</div>}
        {type!=="text" && <input value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Add a caption…" style={s.input}/>}
        <label style={s.label}>Status privacy</label>
        <select value={privacy} onChange={e=>setPrivacy(e.target.value)} style={s.input}>
          <option value="contacts">My contacts</option><option value="except">My contacts except…</option><option value="only">Only share with…</option>
        </select>
        {privacy!=="contacts" && <input value={privacyIds} onChange={e=>setPrivacyIds(e.target.value)} placeholder="Paste contact user IDs, separated by commas" style={s.input}/>}
        <p style={s.hint}>Privacy changes apply to this status. Blocked users cannot see your status.</p>
        <button disabled={busy || (type==="text"?!text.trim():!file)} onClick={post} style={s.post}>{busy?"Uploading…":"Share status"}</button>
      </section>
      <section style={s.list}>
        <h3>My status <small>{data.mine.length}/unexpired</small></h3>
        {data.mine.length===0?<p style={s.empty}>Your status updates will appear here.</p>:data.mine.map(item=><article key={item._id} style={s.item}>
          <button style={s.itemMain} onClick={()=>openStatus(item)}><span style={s.circle}>◉</span><span style={s.itemText}><b>{item.type==="text"?(item.text.slice(0,35)||"Text status"):(item.caption||item.type)}</b><small>{timeLeft(item.expiresAt)}</small></span></button>
          <div style={s.itemActions}><button style={s.views} onClick={()=>showViewers(item._id)}>◉ {item.viewerCount||0} views</button><button style={s.delete} onClick={()=>deleteStatus(item._id)}>Delete</button></div>
        </article>)}
        <h3 style={{marginTop:24}}>Recent updates</h3>
        {loading?<p style={s.empty}>Loading…</p>:data.contacts.length===0?<p style={s.empty}>No new updates yet.</p>:data.contacts.map(group=><article key={group.owner._id} style={s.item}>
          <button style={s.itemMain} onClick={()=>openStatus(group.statuses[0])}><span style={s.circle}>{(group.owner.name||group.owner.username||"U")[0].toUpperCase()}</span><span style={s.itemText}><b>{group.owner.name||group.owner.username}</b><small>{group.statuses.length} update(s) · {timeLeft(group.statuses[group.statuses.length-1].expiresAt)}</small></span></button>
          <button style={s.views} onClick={()=>openStatus(group.statuses[0])}>View updates</button>
        </article>)}
      </section>
    </div>
    {active && <div style={s.viewer} onClick={()=>setActive(null)}><button style={s.close}>×</button><div style={s.viewerContent} onClick={e=>e.stopPropagation()}>{active.type==="text"?<div style={{...s.textCard,background:active.background}}>{active.text}</div>:active.type==="video"?<video src={active.mediaUrl} controls autoPlay style={s.viewerMedia}/>:<img src={active.mediaUrl} alt="Status" style={s.viewerMedia}/>}<p>{active.caption}</p></div></div>}
    {viewerList && <div style={s.modal} onClick={()=>setViewerList(null)}><div style={s.modalCard} onClick={e=>e.stopPropagation()}><header style={s.modalHead}><b>Viewed by · {viewerList.length}</b><button onClick={()=>setViewerList(null)}>×</button></header>{viewerList.map((v,i)=><p key={i}>{v.user?.name||v.user?.username||"User"} <small>{new Date(v.viewedAt).toLocaleString()}</small></p>)}</div></div>}
  </div>;
}
const s={
 page:{height:"100%",width:"100%",overflowY:"auto",background:"var(--surface)",color:"var(--textMain)",fontFamily:"var(--font-ui)"},
 header:{height:70,display:"flex",alignItems:"center",gap:14,padding:"0 20px",borderBottom:"1px solid var(--border)",position:"sticky",top:0,background:"var(--surface)",zIndex:2},
 back:{border:0,background:"var(--chatSelected)",borderRadius:12,width:40,height:40,fontSize:25,color:"var(--textMain)",cursor:"pointer"},
 headerSmall:{}, refresh:{marginLeft:"auto",border:0,background:"var(--chatSelected)",borderRadius:10,padding:10,color:"var(--textMain)",cursor:"pointer"},
 body:{width:"100%",maxWidth:1100,margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",alignItems:"start",gap:16,boxSizing:"border-box"},
 composer:{background:"var(--surfaceAlt)",border:"1px solid var(--border)",borderRadius:18,padding:"clamp(14px,2vw,22px)",alignSelf:"start",minWidth:0,boxSizing:"border-box"},
 list:{background:"var(--surfaceAlt)",border:"1px solid var(--border)",borderRadius:18,padding:"clamp(14px,2vw,22px)",minWidth:0,boxSizing:"border-box"},
 tabs:{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8,marginBottom:14}, selected:{background:"var(--primary)",color:"#fff"},
 pick:{width:"100%",minHeight:130,padding:22,border:"1px dashed var(--border)",borderRadius:14,background:"var(--surface)",color:"var(--textMain)",cursor:"pointer",boxSizing:"border-box"},
 textarea:{width:"100%",minHeight:150,padding:14,borderRadius:12,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--textMain)",resize:"vertical",boxSizing:"border-box"},
 crop:{marginTop:12,overflow:"hidden",borderRadius:14,background:"#111"},cropLabel:{color:"#fff",fontSize:11,padding:8},media:{display:"block",width:"100%",maxHeight:"min(48vh,420px)",objectFit:"contain",background:"#111"},
 input:{width:"100%",boxSizing:"border-box",padding:12,marginTop:10,borderRadius:10,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--textMain)",minWidth:0},
 label:{display:"block",marginTop:16,fontSize:13,fontWeight:700},hint:{fontSize:12,color:"var(--textLight)",lineHeight:1.5},
 post:{width:"100%",padding:13,border:0,borderRadius:12,background:"var(--primary)",color:"#fff",fontWeight:700,cursor:"pointer"},
 item:{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",alignItems:"center",gap:10,padding:"13px 0",borderBottom:"1px solid var(--border)",minWidth:0},itemMain:{display:"grid",gridTemplateColumns:"44px minmax(0,1fr)",alignItems:"center",gap:12,minWidth:0,textAlign:"left",border:0,background:"transparent",color:"var(--textMain)",cursor:"pointer"},itemText:{display:"grid",gap:4,minWidth:0,overflowWrap:"anywhere"},itemActions:{display:"grid",gridTemplateColumns:"auto auto",alignItems:"center",gap:8},circle:{width:44,height:44,borderRadius:"50%",display:"grid",placeItems:"center",border:"3px solid var(--primary)",fontWeight:700,boxSizing:"border-box"},empty:{color:"var(--textLight)",fontSize:13},views:{border:0,background:"var(--chatSelected)",borderRadius:9,padding:"8px 10px",color:"var(--primary)",cursor:"pointer",whiteSpace:"nowrap"},delete:{border:0,background:"transparent",color:"#e5484d",cursor:"pointer",padding:"8px 6px",whiteSpace:"nowrap"},
 viewer:{position:"fixed",inset:0,zIndex:9000,background:"rgba(0,0,0,.94)",display:"grid",placeItems:"center",padding:20},close:{position:"absolute",top:20,right:24,color:"#fff",background:"transparent",border:0,fontSize:34,cursor:"pointer"},viewerContent:{width:"min(520px,100%)",textAlign:"center",color:"#fff"},viewerMedia:{maxWidth:"100%",maxHeight:"78vh",objectFit:"contain"},textCard:{minHeight:"65vh",display:"grid",placeItems:"center",padding:25,color:"#fff",fontSize:30,fontWeight:700,borderRadius:16,overflowWrap:"anywhere"},
 modal:{position:"fixed",inset:0,zIndex:9100,background:"rgba(0,0,0,.5)",display:"grid",placeItems:"center",padding:20},modalCard:{background:"var(--surface)",color:"var(--textMain)",padding:20,borderRadius:16,width:"min(400px,100%)",maxHeight:"70vh",overflowY:"auto"},modalHead:{display:"flex",justifyContent:"space-between"}
};
