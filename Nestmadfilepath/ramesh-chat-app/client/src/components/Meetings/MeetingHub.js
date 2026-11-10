import React, { useEffect, useMemo, useState, useContext } from "react";
import { fetchGroups, sendGroupMessage } from "../../api";
import { AuthContext } from "../../contexts/AuthContext";

const makeRoomCode = () => {
  const bytes = new Uint8Array(12);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
};

export default function MeetingHub({ onBack }) {
  const { user } = useContext(AuthContext);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState(makeRoomCode);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchGroups()
      .then((response) => {
        if (!active) return;
        const items = Array.isArray(response.data) ? response.data : response.data?.groups || [];
        setGroups(items);
      })
      .catch((err) => setError(err.response?.data?.error || "Could not load your groups."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const meetingTitle = roomName.trim() || "Sura Chat meeting";
  const meetingUrl = useMemo(() => `https://meet.jit.si/SuraChat-${roomCode}`, [roomCode]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(meetingUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (_) {
      setError("Clipboard access was blocked. Copy the meeting link manually.");
    }
  };

  const shareToGroup = async () => {
    if (!selectedGroup) return setError("Choose a group before sharing.");
    try {
      const form = new FormData();
      form.append("text", `📹 ${meetingTitle}\nJoin meeting: ${meetingUrl}\nMeeting code: SuraChat-${roomCode}`);
      await sendGroupMessage(selectedGroup, form);
      setError("");
      alert("Meeting link shared in the selected group.");
    } catch (err) {
      setError(err.response?.data?.error || "Could not share the meeting link.");
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button type="button" onClick={onBack} style={styles.back}>← Back</button>
        <div><h1 style={styles.title}>Meetings</h1><p style={styles.subtitle}>Create a room and invite people to join</p></div>
      </header>
      <section style={styles.card}>
        <div style={styles.icon}>▣</div>
        <h2 style={styles.heading}>Start a video meeting</h2>
        <p style={styles.help}>Create a shareable meeting room for multiple participants. Anyone with the room link can join.</p>
        <label style={styles.label}>Meeting name</label>
        <input value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder="Team catch-up" style={styles.input} maxLength={80} />
        <label style={styles.label}>Meeting code</label>
        <div style={styles.codeRow}><code style={styles.code}>{`SuraChat-${roomCode}`}</code><button type="button" style={styles.secondary} onClick={() => setRoomCode(makeRoomCode())}>New code</button></div>
        <div style={styles.actions}>
          <button type="button" style={styles.primary} onClick={() => window.open(meetingUrl, "_blank", "noopener,noreferrer")}>Join / Start meeting ↗</button>
          <button type="button" style={styles.secondary} onClick={copyLink}>{copied ? "Copied" : "Copy invite link"}</button>
        </div>
        <label style={styles.label}>Share invite to a group</label>
        {loading ? <p style={styles.help}>Loading groups…</p> : (
          <div style={styles.shareRow}>
            <select value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)} style={styles.input}>
              <option value="">Select a group</option>
              {groups.map((group) => <option key={group._id} value={group._id}>{group.name}</option>)}
            </select>
            <button type="button" style={styles.secondary} onClick={shareToGroup} disabled={!selectedGroup}>Share</button>
          </div>
        )}
        {error && <p role="alert" style={styles.error}>{error}</p>}
        <p style={styles.note}>Meeting rooms use Jitsi Meet as the video provider. For a private room, join as the host and set a room password in the meeting’s security controls before sharing the link. Password enforcement is handled by Jitsi, not by Sura Chat.</p>
      </section>
    </div>
  );
}

const styles = {
  page: { flex: 1, minWidth: 0, minHeight: 0, overflowY: "auto", background: "var(--primarySoft)", color: "var(--textMain)", padding: "clamp(16px, 3vw, 34px)", fontFamily: "var(--font-ui)" },
  header: { display: "flex", alignItems: "center", gap: 16, margin: "0 auto 24px", maxWidth: 760 },
  back: { border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", color: "var(--textMain)", background: "var(--surface)", cursor: "pointer" },
  title: { margin: 0, fontSize: 26 }, subtitle: { margin: "4px 0 0", color: "var(--textLight)", fontSize: 13 },
  card: { maxWidth: 700, margin: "0 auto", padding: "clamp(18px, 4vw, 30px)", border: "1px solid var(--border)", borderRadius: 22, background: "var(--surface)", boxShadow: "0 16px 50px rgba(35,25,80,.07)" },
  icon: { width: 54, height: 54, borderRadius: 16, display: "grid", placeItems: "center", color: "#fff", background: "var(--primary)", fontSize: 25 },
  heading: { margin: "18px 0 6px", fontSize: 21 }, help: { color: "var(--textLight)", lineHeight: 1.6, fontSize: 13 },
  label: { display: "block", fontSize: 13, fontWeight: 700, margin: "18px 0 7px" },
  input: { width: "100%", minWidth: 0, boxSizing: "border-box", border: "1px solid var(--border)", borderRadius: 11, padding: "12px 13px", color: "var(--textMain)", background: "var(--surface)" },
  codeRow: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }, code: { flex: 1, padding: 13, borderRadius: 10, background: "var(--primarySoft)", overflowWrap: "anywhere" },
  actions: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 },
  primary: { border: 0, borderRadius: 11, padding: "12px 17px", background: "var(--primary)", color: "#fff", fontWeight: 700, cursor: "pointer" },
  secondary: { border: "1px solid var(--border)", borderRadius: 11, padding: "11px 14px", background: "var(--surface)", color: "var(--textMain)", cursor: "pointer" },
  shareRow: { display: "flex", gap: 10, alignItems: "center" }, error: { color: "#c33", fontSize: 13 },
  note: { marginTop: 22, padding: 13, borderRadius: 12, background: "var(--primarySoft)", color: "var(--textLight)", fontSize: 12, lineHeight: 1.6 },
};
