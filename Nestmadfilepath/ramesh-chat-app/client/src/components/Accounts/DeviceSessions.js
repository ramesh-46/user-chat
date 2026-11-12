import React,{useCallback,useEffect,useState}from"react";
import{useNavigate}from"react-router-dom";
import api from"../../api";
import {auth} from "../../firebase";
import {onAuthStateChanged} from "firebase/auth";

const waitForFirebaseUser=()=>new Promise(resolve=>{
  if(auth.currentUser)return resolve(auth.currentUser);
  let unsubscribe=()=>{};
  const timeout=setTimeout(()=>{unsubscribe();resolve(null);},10000);
  unsubscribe=onAuthStateChanged(auth,user=>{if(user){clearTimeout(timeout);unsubscribe();resolve(user);}});
});

export default function DeviceSessions(){
  const nav=useNavigate();
  const [rows,setRows]=useState([]);
  const [busy,setBusy]=useState(true);
  const [working,setWorking]=useState("");
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const load=useCallback(async()=>{
    try{
      setBusy(true);setError("");
      if(!localStorage.getItem("deviceSession")){
        const registered=await api.post("/auth-extra/session/register",{
          deviceName:/Mobi/i.test(navigator.userAgent)?"Mobile device":"Desktop browser",
          userAgent:navigator.userAgent
        });
        if(registered.data.sessionToken)localStorage.setItem("deviceSession",registered.data.sessionToken);
      }
      const r=await api.get("/settings/sessions");
      setRows(Array.isArray(r.data.sessions)?r.data.sessions:[]);
    }catch(e){setError(e.response?.data?.error||"Unable to load login sessions. Check your connection and try again.");}
    finally{setBusy(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  async function revoke(id){
    if(!window.confirm("Log out this device?"))return;
    try{setWorking(id);await api.delete("/settings/sessions/"+id);setNotice("Device session revoked.");await load();}
    catch(e){setError(e.response?.data?.error||"Unable to revoke this session.");}
    finally{setWorking("");}
  }
  async function revokeOthers(){
    if(!window.confirm("Log out all other devices? This browser will remain signed in."))return;
    try{setWorking("all");await api.post("/settings/sessions/revoke-others");setNotice("All other device sessions were revoked.");await load();}
    catch(e){setError(e.response?.data?.error||"Unable to revoke other sessions.");}
    finally{setWorking("");}
  }
  return <main style={s.page}><section style={s.panel}>
    <header style={s.header}>
      <button style={s.back} onClick={()=>nav("/")}>← Back to chat</button>
      <span style={s.eyebrow}>ACCOUNT SECURITY</span>
      <h1 style={s.title}>Login sessions</h1>
      <p style={s.subtitle}>See where your Black Pearl account is signed in. Remove any device you no longer use.</p>
    </header>
    <div style={s.toolbar}><div><b>{rows.length} {rows.length===1?"device":"devices"}</b><small> registered to your account</small></div>
      <button style={s.refresh} onClick={load} disabled={busy||!!working}>{busy?"Refreshing…":"↻ Refresh"}</button></div>
    {error&&<div role="alert" style={s.error}>{error}<button style={s.retry} onClick={load}>Try again</button></div>}
    {notice&&<div role="status" style={s.notice}>{notice}</div>}
    {busy?<div style={s.empty}>Loading your secure device list…</div>:rows.length===0?
      <div style={s.empty}><div style={s.emptyIcon}>▣</div><b>No device sessions found</b><p>This browser could not register a session. Sign out and sign in again, then refresh this page.</p></div>:
      <div style={s.list}>{rows.map(x=><article key={x._id} style={s.row}>
        <div style={s.deviceIcon}>{/Android|iOS/i.test(x.platform||"")?"▯":/Windows|macOS|Linux/i.test(x.platform||"")?"▣":"◫"}</div>
        <div style={s.details}><div style={s.deviceTitle}>{x.deviceName||"Browser"} {x.current&&<span style={s.current}>THIS DEVICE</span>}</div>
          <div style={s.meta}>{x.browser||"Browser"} · {x.platform||"Unknown platform"}</div>
          <small style={s.lastSeen}>Last active {new Date(x.lastActiveAt||x.createdAt).toLocaleString()}</small></div>
        {!x.current&&<button style={s.revoke} disabled={!!working} onClick={()=>revoke(x._id)}>{working===x._id?"Removing…":"Log out"}</button>}
      </article>)}</div>}
    <div style={s.footer}><button style={s.scan} onClick={()=>nav("/qr-approve")}>▦ Scan QR to connect a device</button>
      <button style={s.revokeAll} disabled={!!working||!rows.some(x=>x.current)} onClick={revokeOthers}>{working==="all"?"Logging out…":"Log out all other devices"}</button>
      <p>QR approvals expire after 2 minutes. Only approve a login you personally started.</p></div>
  </section></main>;
}
const s={
page:{minHeight:"100dvh",padding:"clamp(14px,4vw,32px)",display:"flex",justifyContent:"center",alignItems:"flex-start",background:"radial-gradient(circle at 10% 0%,rgba(128,101,245,.2),transparent 34%),#080b14",color:"#f8f5eb",boxSizing:"border-box",fontFamily:"Inter,system-ui,sans-serif"},
panel:{width:"min(100%,760px)",padding:"clamp(18px,4vw,32px)",borderRadius:24,background:"linear-gradient(145deg,#171d2d,#101522)",border:"1px solid rgba(216,189,112,.24)",boxShadow:"0 24px 80px rgba(0,0,0,.35)",boxSizing:"border-box"},
header:{paddingBottom:22,borderBottom:"1px solid #ffffff18"},back:{border:0,background:"transparent",color:"#d8bd70",padding:"6px 0",cursor:"pointer",fontWeight:700},
eyebrow:{display:"block",marginTop:22,color:"#d8bd70",fontSize:10,fontWeight:900,letterSpacing:2.5},title:{fontSize:"clamp(26px,5vw,34px)",margin:"8px 0",letterSpacing:-.8},
subtitle:{color:"#a9afbf",fontSize:14,lineHeight:1.6,margin:0,maxWidth:560},toolbar:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:"20px 0",color:"#f8f5eb"},
refresh:{border:"1px solid #ffffff24",background:"#ffffff0b",color:"#f8f5eb",borderRadius:10,padding:"9px 13px",cursor:"pointer"},list:{display:"grid",gap:10},
row:{display:"flex",alignItems:"center",gap:14,padding:16,border:"1px solid #ffffff18",borderRadius:16,background:"#ffffff06",minWidth:0},
deviceIcon:{width:44,height:44,flexShrink:0,display:"grid",placeItems:"center",borderRadius:13,background:"rgba(216,189,112,.12)",color:"#e8d28d",fontSize:23},
details:{flex:1,minWidth:0},deviceTitle:{fontWeight:800,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"},
current:{fontSize:9,letterSpacing:1,color:"#b9f4cf",background:"#1d6b4533",border:"1px solid #4ade8055",padding:"4px 7px",borderRadius:20},
meta:{fontSize:12,color:"#b9bfd0",marginTop:5},lastSeen:{display:"block",fontSize:11,color:"#858da2",marginTop:5},
revoke:{border:"1px solid #ef777755",background:"#ef444414",color:"#ffaaaa",borderRadius:9,padding:"9px 12px",cursor:"pointer",flexShrink:0},
empty:{textAlign:"center",padding:"42px 18px",color:"#a9afbf",border:"1px dashed #ffffff24",borderRadius:16},emptyIcon:{fontSize:32,color:"#d8bd70",marginBottom:12},
footer:{marginTop:22,display:"grid",gap:10},scan:{width:"100%",padding:14,border:0,borderRadius:12,background:"linear-gradient(110deg,#d8bd70,#b58a35)",color:"#17130a",fontWeight:900,cursor:"pointer"},
revokeAll:{width:"100%",padding:13,border:"1px solid #ef777755",borderRadius:12,background:"transparent",color:"#ffaaaa",fontWeight:700,cursor:"pointer"},
error:{padding:12,margin:"4px 0",borderRadius:10,background:"#ef444418",color:"#ffaaaa",fontSize:13},retry:{marginLeft:12,border:0,background:"transparent",color:"#f8d98a",textDecoration:"underline",cursor:"pointer"},
notice:{padding:12,margin:"4px 0",borderRadius:10,background:"#22c55e18",color:"#b9f4cf",fontSize:13}
};