import React from "react";

export default function MeetingInviteMessage({ text, linkify }) {
  const value = String(text || "");
  const match = value.match(/https?:\/\/[^\s]*\/meeting\/[A-Za-z0-9_-]+/i);
  if (!match) return <>{linkify ? linkify(value) : value}</>;

  const url = match[0].replace(/[),.!?]+$/, "");
  const description = value.replace(match[0], "").replace(/(?:Join here:|Join meeting:?)\s*/i, "").replace(/(?:📹\s*)?Group video meeting/i, "").replace(/Room code:\s*[A-Za-z0-9_-]+/i, "").trim();

  return (
    <div style={{ width: "min(100%, 330px)", margin: "5px 0 2px", borderRadius: 16, overflow: "hidden", background: "linear-gradient(145deg,#211B3B,#38296F)", color: "#fff", border: "1px solid rgba(255,255,255,.16)", boxShadow: "0 8px 22px rgba(40,25,90,.18)" }}>
      <div style={{ padding: "14px 15px 12px", display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ width: 42, height: 42, borderRadius: 13, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#9B83FF,#7255E8)", fontSize: 21 }}>▣</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: ".01em" }}>Sura Chat meeting</div>
          <div style={{ fontSize: 11, color: "#D4CCF5", marginTop: 3 }}>Video call invitation</div>
        </div>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#B7F5D2", background: "rgba(69,190,132,.15)", border: "1px solid rgba(120,230,175,.25)", padding: "4px 7px", borderRadius: 20 }}>INVITE</span>
      </div>
      <div style={{ padding: "0 15px 13px", fontSize: 12, color: "#D8D1F1", lineHeight: 1.45 }}>
        {description || "You’re invited to join a video meeting. Tap below when you’re ready."}
      </div>
      <div style={{ padding: "0 13px 13px" }}>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", boxSizing: "border-box", textDecoration: "none", borderRadius: 11, padding: "11px 14px", color: "#281D50", background: "linear-gradient(100deg,#D8CEFF,#BBAAFF)", fontWeight: 800, fontSize: 13 }}>
          Join meeting <span aria-hidden="true">→</span>
        </a>
      </div>
      <div style={{ padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,.12)", color: "#BEB5DE", fontSize: 10, overflowWrap: "anywhere" }}>Sura Chat · Secure meeting link</div>
    </div>
  );
}
