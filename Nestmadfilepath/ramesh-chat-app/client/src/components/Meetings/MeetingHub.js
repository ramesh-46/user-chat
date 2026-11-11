import React, { useEffect, useMemo, useState, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchGroups, fetchChatList, sendMessage, sendGroupMessage,
  createMeeting, fetchMyMeetings, joinMeeting, endMeeting,
  inviteToMeeting, fetchMeetingInvites, acceptMeetingInvite, declineMeetingInvite,
} from "../../api";
import { AuthContext } from "../../contexts/AuthContext";

// Public meeting codes look like Google Meet: xxx-yyyy-zzz
const CODE_RE = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;

// Accept a pasted code (xxx-yyy-zzz style) or a full /meeting/... link.
function extractId(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    const match = url.pathname.match(/\/meeting\/([a-z0-9-]+)/i);
    if (match) return match[1].toLowerCase();
  } catch (_) { /* not a URL — treat as a code */ }
  return raw.replace(/\s+/g, "");
}

export default function MeetingHub({ onBack }) {
  const { user } = useContext(AuthContext), navigate = useNavigate();
  const [mode, setMode] = useState("create"); // create | join
  const [roomName, setRoomName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [waitingRoom, setWaitingRoom] = useState(true);
  const [schedule, setSchedule] = useState("");
  const [joinId, setJoinId] = useState("");
  const [joinPasscode, setJoinPasscode] = useState("");
  const [created, setCreated] = useState(null);
  const [myMeetings, setMyMeetings] = useState([]);
  const [invites, setInvites] = useState([]);
  const [people, setPeople] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [showShare, setShowShare] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const userId = String(user?._id || user?.userId || "");
  const link = useMemo(() => created ? window.location.origin + "/meeting/" + created.roomId : "", [created]);
  const title = roomName.trim() || "Sura Chat meeting";

  const loadInvites = useCallback(() => {
    fetchMeetingInvites()
      .then((r) => setInvites(r.data?.invites || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let live = true;
    Promise.all([fetchChatList(userId), fetchGroups(), fetchMyMeetings()])
      .then(([c, g, m]) => {
        if (!live) return;
        setPeople(c.data?.users || []);
        setGroups(Array.isArray(g.data) ? g.data : g.data?.groups || []);
        setMyMeetings(m.data?.meetings || []);
      })
      .catch(() => live && setError("Could not load chats and groups."));
    loadInvites();
    const timer = setInterval(loadInvites, 20000); // keep the invite list fresh
    return () => { live = false; clearInterval(timer); };
  }, [userId, loadInvites]);

  const toggle = (id, list, set) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const create = async () => {
    setLoading(true); setError(""); setNotice("");
    try {
      const response = await createMeeting({ title, passcode, waitingRoom, scheduledAt: schedule || undefined });
      setCreated(response.data.meeting);
      setMyMeetings((list) => [response.data.meeting, ...list].slice(0, 20));
    } catch (e) {
      setError(e.response?.data?.error || "Could not create the meeting. Please try again.");
    } finally { setLoading(false); }
  };

  const join = async () => {
    const id = extractId(joinId);
    if (!id) return setError("Enter a meeting code like abc-defg-hij or a meeting link.");
    setLoading(true); setError("");
    try {
      const response = await joinMeeting(id, joinPasscode);
      navigate("/meeting/" + response.data.meeting.roomId, { state: { passcode: joinPasscode } });
    } catch (e) {
      setError(e.response?.data?.error || "Could not join that meeting.");
      setLoading(false);
    }
  };

  const share = async () => {
    if (!created) return;
    if (!selectedPeople.length && !selectedGroups.length) return setError("Select at least one chat or group.");
    setLoading(true); setError(""); setNotice("");
    const message = "📹 " + created.title + "\nJoin my Sura Chat meeting: " + link + "\nMeeting code: " + created.code;
    try {
      // Real invitations (notification with Join / Decline) for direct chats,
      // plus the link message in every selected chat and group.
      await inviteToMeeting(created.roomId, selectedPeople).catch(() => {});
      await Promise.all([
        ...selectedPeople.map((receiver) => {
          const f = new FormData();
          f.append("sender", userId); f.append("receiver", receiver); f.append("text", message);
          return sendMessage(f);
        }),
        ...selectedGroups.map((id) => { const f = new FormData(); f.append("text", message); return sendGroupMessage(id, f); })
      ]);
      setNotice("Meeting invitation sent to selected chats and groups.");
      setShowShare(false); setSelectedPeople([]); setSelectedGroups([]);
    } catch (e) {
      setError(e.response?.data?.error || "Could not send all invitations.");
    } finally { setLoading(false); }
  };

  const acceptInvite = async (invite) => {
    setError("");
    try {
      const r = await acceptMeetingInvite(invite._id);
      setInvites((list) => list.filter((i) => i._id !== invite._id));
      navigate("/meeting/" + r.data.meeting.roomId, { state: { passcode: "" } });
    } catch (e) {
      setInvites((list) => list.filter((i) => i._id !== invite._id));
      setError(e.response?.data?.error || "Could not join that meeting.");
    }
  };

  const declineInvite = async (invite) => {
    setInvites((list) => list.filter((i) => i._id !== invite._id));
    declineMeetingInvite(invite._id).catch(() => {});
  };

  const endMyMeeting = async (meeting) => {
    setMyMeetings((list) => list.filter((m) => m.roomId !== meeting.roomId));
    try { await endMeeting(meeting.roomId); setNotice(`"${meeting.title}" was ended for everyone.`); }
    catch (e) { setError(e.response?.data?.error || "Could not end the meeting."); }
  };

  const copy = async (value, okMessage) => {
    try { await navigator.clipboard.writeText(value); setNotice(okMessage); }
    catch (_) { setError("Copy is unavailable in this browser — select the text and copy manually."); }
  };

  const fmtDate = (value) => value ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "";

  return (
    <div style={s.page}>
      <header style={s.header}>
        <button style={s.secondary} onClick={onBack}>← Back</button>
        <div><h1 style={s.title}>Sura Chat Meetings</h1><p style={s.sub}>Video meetings with codes, lobby and host controls</p></div>
      </header>

      <section style={s.card}>
        {/* Invitations received from other people */}
        {invites.length > 0 && (
          <>
            <h3 style={s.listTitle}>Meeting invitations ({invites.length})</h3>
            {invites.map((inv) => (
              <div style={s.meetingRow} key={inv._id}>
                <div style={{ minWidth: 0 }}>
                  <b style={s.meetingName}>{inv.title}</b>
                  <div style={s.sub}>From {inv.from?.name || inv.from?.username || "a Sura Chat user"} · code {inv.code}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button style={s.primary} onClick={() => acceptInvite(invite)}>Join</button>
                  <button style={s.small} onClick={() => declineInvite(invite)}>Decline</button>
                </div>
              </div>
            ))}
          </>
        )}

        <div style={s.tabs}>
          <button style={{ ...s.tab, ...(mode === "create" ? s.tabActive : {}) }} onClick={() => { setMode("create"); setError(""); setNotice(""); }}>Create</button>
          <button style={{ ...s.tab, ...(mode === "join" ? s.tabActive : {}) }} onClick={() => { setMode("join"); setError(""); setNotice(""); }}>Join</button>
        </div>

        {mode === "create" ? (
          !created ? (
            <>
              <label style={s.label}>Meeting name</label>
              <input style={s.input} value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Team catch-up" maxLength={80} />
              <label style={s.label}>Meeting passcode (optional)</label>
              <input style={s.input} value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="4–32 characters" maxLength={32} />
              <label style={s.label}>Schedule for later (optional)</label>
              <input style={s.input} type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
              <label style={s.checkRow}>
                <input type="checkbox" checked={waitingRoom} onChange={(e) => setWaitingRoom(e.target.checked)} />
                Waiting room — I approve each participant before they join
              </label>
              {error && <p style={s.error}>{error}</p>}
              <button style={{ ...s.primary, width: "100%", marginTop: 12 }} disabled={loading || (passcode.length > 0 && passcode.length < 4)} onClick={create}>
                {loading ? "Creating…" : "＋ New meeting"}
              </button>
            </>
          ) : (
            <>
              <div style={s.success}>Meeting ready</div>
              <label style={s.label}>Meeting code</label>
              <div style={s.codeRow}><strong style={s.code}>{created.code}</strong><button style={s.small} onClick={() => copy(created.code, "Meeting code copied.")}>Copy code</button></div>
              <label style={s.label}>Join link</label>
              <div style={s.link}>{link}</div>
              {created.scheduledAt && <p style={s.sub}>Scheduled for {fmtDate(created.scheduledAt)}</p>}
              {created.hasPasscode && <p style={s.sub}>Passcode: {passcode} — share it separately with participants.</p>}
              <div style={s.actions}>
                <button style={s.primary} onClick={() => navigate("/meeting/" + created.roomId, { state: { passcode, isHost: true } })}>Start now ↗</button>
                <button style={s.secondary} onClick={() => copy(link, "Meeting link copied.")}>Copy link</button>
                <button style={s.secondary} onClick={() => { setCreated(null); setPasscode(""); setSchedule(""); }}>New meeting</button>
              </div>
              <button style={{ ...s.primary, width: "100%", marginTop: 12 }} onClick={() => setShowShare((v) => !v)}>Share in Sura Chat</button>
              {showShare && (
                <div style={s.share}>
                  <h3>Choose chats and groups</h3>
                  <div style={s.list}>
                    <b style={s.section}>Direct chats</b>
                    {people.length ? people.map((p) => (
                      <label style={s.item} key={p._id}>
                        <input type="checkbox" checked={selectedPeople.includes(String(p._id))} onChange={() => toggle(String(p._id), selectedPeople, setSelectedPeople)} />
                        {p.name || p.username || p.mobile || "Sura Chat user"}
                      </label>
                    )) : <p style={s.sub}>No direct chats found.</p>}
                    <b style={s.section}>Groups</b>
                    {groups.length ? groups.map((g) => (
                      <label style={s.item} key={g._id}>
                        <input type="checkbox" checked={selectedGroups.includes(String(g._id))} onChange={() => toggle(String(g._id), selectedGroups, setSelectedGroups)} />
                        👥 {g.name || "Group"}
                      </label>
                    )) : <p style={s.sub}>No groups found.</p>}
                  </div>
                  <button style={s.primary} disabled={loading} onClick={share}>{loading ? "Sending…" : "Send meeting invite"}</button>
                </div>
              )}
            </>
          )
        ) : (
          <>
            <label style={s.label}>Meeting code or link</label>
            <input style={s.input} value={joinId} onChange={(e) => setJoinId(e.target.value)} placeholder="abc-defg-hij" autoCapitalize="none" />
            <label style={s.label}>Meeting passcode (if required)</label>
            <input style={s.input} value={joinPasscode} onChange={(e) => setJoinPasscode(e.target.value)} placeholder="Passcode" maxLength={32} />
            {error && <p style={s.error}>{error}</p>}
            <button style={{ ...s.primary, width: "100%", marginTop: 12 }} disabled={loading} onClick={join}>{loading ? "Checking…" : "Join meeting ↗"}</button>
          </>
        )}

        {notice && <p style={s.notice}>{notice}</p>}

        {mode === "create" && !created && myMeetings.length > 0 && (
          <>
            <h3 style={s.listTitle}>Your meetings — rejoin or end</h3>
            {myMeetings.map((m) => (
              <div style={s.meetingRow} key={m.roomId}>
                <div style={{ minWidth: 0 }}>
                  <b style={s.meetingName}>{m.title}</b>
                  <div style={s.sub}>{CODE_RE.test(m.code || "") ? m.code : ""}{m.scheduledAt ? " · " + fmtDate(m.scheduledAt) : ""}{m.waitingRoom ? " · lobby on" : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button style={s.primary} onClick={() => navigate("/meeting/" + m.roomId)}>Rejoin</button>
                  <button style={{ ...s.small, color: "#c33" }} onClick={() => endMyMeeting(m)}>End</button>
                </div>
              </div>
            ))}
          </>
        )}
        <p style={s.foot}>Participants sign in to Sura Chat and allow camera and microphone access. With the waiting room on, you approve everyone before they enter — even from the chat window. The link and code expire after 24 hours.</p>
      </section>
    </div>
  );
}

const s = {
  page: { flex: 1, minWidth: 0, minHeight: 0, overflowY: "auto", background: "var(--primarySoft)", color: "var(--textMain)", padding: "clamp(14px,3vw,32px)", fontFamily: "var(--font-ui)" },
  header: { display: "flex", alignItems: "center", gap: 14, maxWidth: 760, margin: "0 auto 22px" },
  title: { margin: 0, fontSize: 24 },
  sub: { color: "var(--textLight)", fontSize: 13, lineHeight: 1.6 },
  card: { maxWidth: 700, margin: "0 auto", padding: "clamp(18px,4vw,30px)", border: "1px solid var(--border)", borderRadius: 22, background: "var(--surface)" },
  tabs: { display: "flex", gap: 8, marginBottom: 16 },
  tab: { flex: 1, border: "1px solid var(--border)", borderRadius: 11, padding: "10px 0", background: "var(--surface)", color: "var(--textMain)", fontWeight: 700, cursor: "pointer" },
  tabActive: { background: "var(--primary)", color: "#fff", borderColor: "var(--primary)" },
  label: { display: "block", fontSize: 13, fontWeight: 700, margin: "18px 0 7px" },
  input: { width: "100%", boxSizing: "border-box", padding: 12, border: "1px solid var(--border)", borderRadius: 11, background: "var(--surface)", color: "var(--textMain)" },
  checkRow: { display: "flex", alignItems: "center", gap: 9, fontSize: 13, margin: "16px 0 4px" },
  link: { padding: 13, borderRadius: 11, background: "var(--primarySoft)", fontSize: 13, overflowWrap: "anywhere" },
  codeRow: { display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border)", borderRadius: 11, padding: "10px 12px" },
  code: { fontSize: 20, letterSpacing: 2, textTransform: "lowercase" },
  actions: { display: "flex", gap: 9, flexWrap: "wrap", marginTop: 14 },
  primary: { border: 0, borderRadius: 11, padding: "12px 16px", background: "var(--primary)", color: "#fff", fontWeight: 700, cursor: "pointer" },
  secondary: { border: "1px solid var(--border)", borderRadius: 11, padding: "11px 14px", background: "var(--surface)", color: "var(--textMain)", cursor: "pointer" },
  small: { flexShrink: 0, border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", background: "var(--primarySoft)", color: "var(--textMain)", cursor: "pointer" },
  share: { marginTop: 15, padding: 14, border: "1px solid var(--border)", borderRadius: 14 },
  list: { maxHeight: 270, overflowY: "auto", marginBottom: 12 },
  listTitle: { margin: "22px 0 6px", fontSize: 15 },
  section: { display: "block", padding: "10px 0 5px", fontSize: 12, color: "var(--textLight)" },
  item: { display: "flex", alignItems: "center", gap: 10, padding: "9px 3px", borderBottom: "1px solid var(--border)", fontSize: 14 },
  meetingRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" },
  meetingName: { fontSize: 14 },
  success: { padding: 12, borderRadius: 11, background: "rgba(37,177,119,.12)", color: "#1d9c68", fontWeight: 700, fontSize: 14 },
  foot: { marginTop: 20, padding: 13, borderRadius: 12, background: "var(--primarySoft)", color: "var(--textLight)", fontSize: 12, lineHeight: 1.6 },
  error: { color: "#c33", fontSize: 13 },
  notice: { color: "#218653", fontSize: 13 },
};
