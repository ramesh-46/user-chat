const express = require("express");
const crypto = require("crypto");
const admin = require("../config/firebaseAdmin");
const User = require("../models/User");
const QrLogin = require("../models/QrLogin");
const LoginSession = require("../models/LoginSession");

const router = express.Router();
const hash = (value) => crypto.createHash("sha256").update(String(value || "")).digest("hex");
const random = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");

// Never log QR secrets, Firebase ID/custom tokens, passwords, or full query strings.
const qrLog = (stage, traceId, details = {}) => console.info("[QR_LOGIN]", JSON.stringify({
  stage, traceId, at: new Date().toISOString(), ...details,
}));

async function identity(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    const error = new Error("Authentication required");
    error.status = 401;
    throw error;
  }
  const decoded = await admin.auth().verifyIdToken(header.slice(7));
  const user = await User.findOne({ firebaseUid: decoded.uid });
  if (!user) {
    const error = new Error("Chat account not found for this Firebase account");
    error.status = 404;
    throw error;
  }
  return { decoded, user };
}

function device(userAgent) {
  const ua = String(userAgent || "");
  return {
    browser: ua.includes("Edg/") ? "Edge" : ua.includes("Chrome/") ? "Chrome" : ua.includes("Firefox/") ? "Firefox" : ua.includes("Safari/") ? "Safari" : "Browser",
    platform: /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "Unknown",
  };
}

async function addSession(user, body = {}) {
  const token = random();
  const ua = String(body.userAgent || "").slice(0, 300);
  const details = device(ua);
  await LoginSession.create({
    userId: user._id,
    tokenHash: hash(token),
    deviceName: String(body.deviceName || details.platform + " device").slice(0, 80),
    browser: details.browser,
    platform: details.platform,
    userAgent: ua,
    lastActiveAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  return token;
}

router.post("/session/register", async (req, res) => {
  try {
    const { user } = await identity(req);
    return res.json({ sessionToken: await addSession(user, req.body || {}) });
  } catch (error) {
    console.error("[QR_LOGIN][session.register.failed]", { code: error.code || "unknown", message: error.message });
    return res.status(error.status || 401).json({ error: error.message || "Unable to register this device" });
  }
});

router.post("/qr/start", async (req, res) => {
  const startedAt = Date.now();
  const traceId = random(6);
  qrLog("backend.start.request", traceId, { device: String(req.body?.deviceName || "unknown").slice(0, 60) });
  try {
    const sessionId = random(16);
    const secret = random(32);
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
    qrLog("backend.start.db_write.begin", traceId);
    await QrLogin.create({
      sessionId, secretHash: hash(secret), status: "pending",
      deviceName: String(req.body?.deviceName || "New device").slice(0, 80),
      userAgent: String(req.body?.userAgent || "").slice(0, 300), expiresAt,
    });
    const origin = (process.env.CLIENT_ORIGIN || "https://user-chat-woad.vercel.app").replace(/\/$/, "");
    qrLog("backend.start.success", traceId, { durationMs: Date.now() - startedAt });
    return res.json({
      sessionId, secret, expiresAt,
      approvalUrl: origin + "/qr-approve?session=" + encodeURIComponent(sessionId) + "&secret=" + encodeURIComponent(secret),
    });
  } catch (error) {
    qrLog("backend.start.failed", traceId, { durationMs: Date.now() - startedAt, code: error.code || "unknown", message: error.message });
    return res.status(500).json({ error: "Unable to create QR login" });
  }
});

router.post("/qr/approve", async (req, res) => {
  const startedAt = Date.now();
  const traceId = random(6);
  qrLog("backend.approve.request", traceId, { hasSessionId: Boolean(req.body?.sessionId), hasSecret: Boolean(req.body?.secret) });
  try {
    qrLog("backend.approve.auth.begin", traceId);
    const { user } = await identity(req);
    qrLog("backend.approve.auth.success", traceId, { userId: String(user._id) });
    const sessionId = String(req.body?.sessionId || "");
    const secret = String(req.body?.secret || "");
    if (!/^[a-f0-9]{32}$/.test(sessionId) || !/^[a-f0-9]{64}$/.test(secret)) {
      qrLog("backend.approve.invalid_payload", traceId);
      return res.status(400).json({ error: "Invalid QR login code" });
    }
    qrLog("backend.approve.db_lookup.begin", traceId);
    const row = await QrLogin.findOne({
      sessionId, secretHash: hash(secret), status: "pending", expiresAt: { $gt: new Date() },
    });
    if (!row) {
      qrLog("backend.approve.not_found_or_expired", traceId, { durationMs: Date.now() - startedAt });
      return res.status(410).json({ error: "QR expired or already used" });
    }
    row.status = "approved";
    row.approvedUserId = user._id;
    row.approvedFirebaseUid = user.firebaseUid;
    await row.save();
    qrLog("backend.approve.success", traceId, { durationMs: Date.now() - startedAt });
    return res.json({ success: true, message: "Login approved. The other device will now sign in." });
  } catch (error) {
    qrLog("backend.approve.failed", traceId, { durationMs: Date.now() - startedAt, code: error.code || "unknown", message: error.message, status: error.status || 500 });
    return res.status(error.status || 401).json({ error: error.message || "Unable to approve QR login" });
  }
});

router.get("/qr/status", async (req, res) => {
  const startedAt = Date.now();
  const traceId = random(6);
  qrLog("backend.status.request", traceId, { hasSessionId: Boolean(req.query.sessionId), hasSecret: Boolean(req.query.secret) });
  try {
    const sessionId = String(req.query.sessionId || "");
    const secret = String(req.query.secret || "");
    if (!/^[a-f0-9]{32}$/.test(sessionId) || !/^[a-f0-9]{64}$/.test(secret)) {
      qrLog("backend.status.invalid_payload", traceId);
      return res.status(400).json({ error: "Invalid QR login code", code: "INVALID_QR" });
    }
    qrLog("backend.status.db_lookup.begin", traceId);
    const row = await QrLogin.findOne({
      sessionId, secretHash: hash(secret), expiresAt: { $gt: new Date() },
    }).select("+approvedFirebaseUid approvedUserId status expiresAt sessionId");
    if (!row || row.status === "consumed") {
      qrLog("backend.status.expired_or_missing", traceId, { found: Boolean(row), status: row?.status || "missing", durationMs: Date.now() - startedAt });
      return res.status(410).json({ status: "expired", error: "This QR code expired or was already used" });
    }
    if (row.status !== "approved") {
      qrLog("backend.status.pending", traceId, { durationMs: Date.now() - startedAt });
      return res.json({ status: "pending" });
    }
    qrLog("backend.status.approved_record_found", traceId, { hasApprovedUid: Boolean(row.approvedFirebaseUid), hasApprovedUserId: Boolean(row.approvedUserId) });
    let firebaseUid = row.approvedFirebaseUid;
    if (!firebaseUid && row.approvedUserId) {
      qrLog("backend.status.user_recovery.begin", traceId);
      const approvedUser = await User.findById(row.approvedUserId).select("firebaseUid").lean();
      firebaseUid = approvedUser?.firebaseUid || "";
      qrLog("backend.status.user_recovery.result", traceId, { found: Boolean(firebaseUid) });
    }
    if (!firebaseUid) {
      qrLog("backend.status.approved_uid_missing", traceId, { durationMs: Date.now() - startedAt });
      return res.status(409).json({ status: "error", code: "QR_APPROVAL_ACCOUNT_MISSING", error: "The approved account could not be found. Please generate a new QR code." });
    }
    qrLog("backend.status.firebase_custom_token.begin", traceId);
    const customToken = await admin.auth().createCustomToken(String(firebaseUid));
    qrLog("backend.status.success", traceId, { durationMs: Date.now() - startedAt });
    return res.json({ status: "approved", customToken });
  } catch (error) {
    qrLog("backend.status.failed", traceId, { durationMs: Date.now() - startedAt, code: error.code || "unknown", message: error.message || "Unknown error" });
    return res.status(503).json({
      status: "error", code: "QR_TOKEN_CREATION_FAILED",
      error: "Firebase could not create the secure sign-in token. Check Firebase Admin credentials in Render, then try a new QR code.",
    });
  }
});

router.post("/qr/complete", async (req, res) => {
  const startedAt = Date.now();
  const traceId = random(6);
  qrLog("backend.complete.request", traceId, { hasSessionId: Boolean(req.body?.sessionId), hasIdToken: Boolean(req.body?.idToken) });
  try {
    qrLog("backend.complete.auth.begin", traceId);
    const { decoded, user } = await identity(req);
    qrLog("backend.complete.auth.success", traceId, { userId: String(user._id) });
    const sessionId = String(req.body?.sessionId || "");
    if (!sessionId) {
      qrLog("backend.complete.missing_session", traceId);
      return res.status(400).json({ error: "Missing QR login session" });
    }
    qrLog("backend.complete.consume.begin", traceId);
    const row = await QrLogin.findOneAndUpdate({
      sessionId, status: "approved", expiresAt: { $gt: new Date() },
      $or: [{ approvedFirebaseUid: decoded.uid }, { approvedUserId: user._id }],
    }, { $set: { status: "consumed", consumedAt: new Date() } }, { new: true });
    if (!row) {
      qrLog("backend.complete.consume_failed", traceId, { durationMs: Date.now() - startedAt });
      return res.status(410).json({ error: "QR approval expired, already used, or belongs to another account" });
    }
    qrLog("backend.complete.session_create.begin", traceId);
    const sessionToken = await addSession(user, req.body || {});
    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.recoveryAnswer;
    qrLog("backend.complete.success", traceId, { durationMs: Date.now() - startedAt });
    return res.json({ user: safeUser, sessionToken });
  } catch (error) {
    qrLog("backend.complete.failed", traceId, { durationMs: Date.now() - startedAt, code: error.code || "unknown", message: error.message, status: error.status || 500 });
    return res.status(error.status || 401).json({ error: error.message || "Unable to complete QR login" });
  }
});

module.exports = router;
