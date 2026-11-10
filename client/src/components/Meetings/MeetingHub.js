import React, { useState } from "react";
import { createMeeting } from "../../api";
import { useNavigate } from "react-router-dom";

export default function MeetingHub() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Sura Chat meeting");
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const [error, setError] = useState("");
  const meetingUrl = created ? window.location.origin + "/meeting/" + created.roomId : "";

  const create = async () => {
    setBusy(true); setError("");
    try {
      const response = await createMeeting({ title, passcode });
      setCreated(response.data.meeting);
    } catch (e) {
      setError(e.response?.data?.error || "Could not create meeting. Please try again.");
    } finally { setBusy(false); }
  };
  const copy = async (value) => {
    try { await navigator.clipboard.writeText(value); }
    catch (_) { setError("Clipboard access is unavailable. You can select and copy the link manually."); }
  };
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: created.title, text: created.hasPasscode ? "Meeting code: " + passcode : "Join my meeting", url: meetingUrl }); }
      catch (_) {}
    } else copy(meetingUrl);
  };

  return <>
    <button type="button" aria-label="Create or join a meeting" title="Meetings"
      onClick={() => { setOpen(true); setCreated(null); setError(""); }}
      style={{ position: "fixed", right: 18, top: 122, zIndex: 1199, width: 44, height: 44, borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--primary)", boxShadow: "0 5px 18px rgba(0,0,0,.08)", cursor: "pointer", fontSize: 19 }}>
      ▣
    </button>
    {open && <div style={styles.backdrop} onClick={() => setOpen(false)}>
      <section role="dialog" aria-modal="true" aria-label="Meetings" style={styles.panel} onClick={e => e.stopPropagation()}>
        <header style={styles.header}><div><strong>Meetings</strong><div style={styles.sub}>Create a video meeting and invite anyone from your chats</div></div><button style={styles.close} onClick={() => setOpen(false)}>×</button></header>
        {!created ? <>
          <label style={styles.label}>Meeting name</label>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={100} style={styles.input} placeholder="Team meeting" />
          <label style={styles.label}>Meeting code (optional)</label>
          <input value={passcode} onChange={e => setPasscode(e.target.value)} minLength={4} maxLength={32} style={styles.input} placeholder="Set a 4–32 character code" />
          <p style={styles.note}>Everyone must sign in to Sura Chat. If you set a code, participants must enter it before the room opens.</p>
          {error && <p style={styles.error}>{error}</p>}
          <button disabled={busy || (passcode.length > 0 && passcode.length < 4)} onClick={create} style={styles.primary}>{busy ? "Creating…" : "＋ Create new meeting"}</button>
          <button onClick={() => { const value = window.prompt("Paste a Sura Chat meeting link"); if (value) { try { const url = new URL(value); const match = url.pathname.match(/\/meeting\/([a-f0-9]{32})/); if (match) { setOpen(false); navigate("/meeting/" + match[1]); } else setError("That meeting link is not valid."); } catch (_) { setError("Enter a valid meeting link."); } } }} style={styles.secondary}>Join with a meeting link</button>
        </> : <>
          <div style={styles.success}>Meeting created</div>
          <label style={styles.label}>Share this link</label>
          <div style={styles.linkRow}><input readOnly value={meetingUrl} style={styles.input} /><button style={styles.secondarySmall} onClick={() => copy(meetingUrl)}>Copy</button></div>
          {created.hasPasscode && <><label style={styles.label}>Meeting code</label><div style={styles.codeRow}><strong>{passcode}</strong><button style={styles.secondarySmall} onClick={() => copy(passcode)}>Copy code</button></div></>}
          <p style={styles.note}>The link expires in 24 hours. Share the meeting code separately with invited participants.</p>
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.primary} onClick={() => { setOpen(false); navigate("/meeting/" + created.roomId, { state: { passcode, isHost: true } }); }}>Join meeting</button>
          <button style={styles.secondary} onClick={share}>Share invite</button>
        </>}
      </section>
    </div>}
  </>;
}

const styles = {
  backdrop: { position: "fixed", inset: 0, zIndex: 30000, background: "rgba(10,12,20,.55)", display: "grid", placeItems: "center", padding: 16 },
  panel: { width: "min(430px, 100%)", background: "var(--surface)", color: "var(--textMain)", border: "1px solid var(--border)", borderRadius: 20, padding: 22, boxShadow: "0 24px 80px rgba(0,0,0,.25)", fontFamily: "var(--font-ui)" },
  header: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 20, fontSize: 19 },
  sub: { color: "var(--textLight)", fontSize: 12, marginTop: 5, fontWeight: 400, lineHeight: 1.5 },
  close: { border: 0, background: "var(--primarySoft)", color: "var(--textMain)", width: 34, height: 34, borderRadius: 10, fontSize: 22, cursor: "pointer" },
  label: { display: "block", fontSize: 12, fontWeight: 700, margin: "13px 0 6px", color: "var(--textLight)" },
  input: { width: "100%", minWidth: 0, boxSizing: "border-box", padding: "12px 13px", borderRadius: 11, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--textMain)", fontSize: 14 },
  note: { color: "var(--textLight)", fontSize: 12, lineHeight: 1.6, margin: "12px 0 16px" },
  primary: { width: "100%", border: 0, borderRadius: 12, padding: 13, background: "var(--primary)", color: "#fff", fontWeight: 700, cursor: "pointer", marginTop: 8 },
  secondary: { width: "100%", border: "1px solid var(--border)", borderRadius: 12, padding: 12, background: "var(--surface)", color: "var(--textMain)", fontWeight: 600, cursor: "pointer", marginTop: 9 },
  secondarySmall: { flexShrink: 0, border: "1px solid var(--border)", borderRadius: 10, padding: "9px 11px", background: "var(--primarySoft)", color: "var(--textMain)", cursor: "pointer" },
  linkRow: { display: "flex", gap: 7, alignItems: "center" },
  codeRow: { display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border)", borderRadius: 11, padding: "8px 10px" },
  success: { padding: 12, borderRadius: 11, background: "rgba(37,177,119,.1)", color: "#1d9c68", fontWeight: 700, fontSize: 14 },
  error: { color: "#dc4b58", fontSize: 12 },
};
