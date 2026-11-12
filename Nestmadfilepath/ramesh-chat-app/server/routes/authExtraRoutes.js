const express = require("express");
const crypto = require("crypto");
const admin = require("../config/firebaseAdmin");
const User = require("../models/User");
const QrLogin = require("../models/QrLogin");
const LoginSession = require("../models/LoginSession");

const router = express.Router();
const hash = (value) => crypto.createHash("sha256").update(String(value || "")).digest("hex");
const random = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");

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
    console.error("[QR_SESSION_REGISTER]", error.code || error.message);
    return res.status(error.status || 401).json({ error: error.message || "Unable to register this device" });
  }
});

router.post("/qr/start", async (req, res) => {
  try {
    const sessionId = random(16);
    const secret = random(32);
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
    await QrLogin.create({
      sessionId,
      secretHash: hash(secret),
      status: "pending",
      deviceName: String(req.body?.deviceName || "New device").slice(0, 80),
      userAgent: String(req.body?.userAgent || "").slice(0, 300),
      expiresAt,
    });
    const origin = (process.env.CLIENT_ORIGIN || "https://user-chat-woad.vercel.app").replace(/\/$/, "");
    return res.json({
      sessionId,
      secret,
      expiresAt,
      approvalUrl: origin + "/qr-approve?session=" + encodeURIComponent(sessionId) + "&secret=" + encodeURIComponent(secret),
    });
  } catch (error) {
    console.error("[QR_START]", error.code || error.message);
    return res.status(500).json({ error: "Unable to create QR login" });
  }
});

router.post("/qr/approve", async (req, res) => {
  try {
    const { user } = await identity(req);
    const sessionId = String(req.body?.sessionId || "");
    const secret = String(req.body?.secret || "");
    if (!/^[a-f0-9]{32}$/.test(sessionId) || !/^[a-f0-9]{64}$/.test(secret)) {
      return res.status(400).json({ error: "Invalid QR login code" });
    }
    const row = await QrLogin.findOne({
      sessionId,
      secretHash: hash(secret),
      status: "pending",
      expiresAt: { $gt: new Date() },
    });
    if (!row) return res.status(410).json({ error: "QR expired or already used" });

    row.status = "approved";
    row.approvedUserId = user._id;
    row.approvedFirebaseUid = user.firebaseUid;
    await row.save();

    return res.json({ success: true, message: "Login approved. The other device will now sign in." });
  } catch (error) {
    console.error("[QR_APPROVE]", error.code || error.message);
    return res.status(error.status || 401).json({ error: error.message || "Unable to approve QR login" });
  }
});

// The QR secret is a 256-bit, short-lived bearer secret. It grants access only to
// this one pairing request and is consumed by /qr/complete after Firebase sign-in.
router.get("/qr/status", async (req, res) => {
  try {
    const sessionId = String(req.query.sessionId || "");
    const secret = String(req.query.secret || "");
    if (!/^[a-f0-9]{32}$/.test(sessionId) || !/^[a-f0-9]{64}$/.test(secret)) {
      return res.status(400).json({ error: "Invalid QR login code", code: "INVALID_QR" });
    }

    const row = await QrLogin.findOne({
      sessionId,
      secretHash: hash(secret),
      expiresAt: { $gt: new Date() },
    }).select("+approvedFirebaseUid approvedUserId status expiresAt sessionId");

    if (!row || row.status === "consumed") {
      return res.status(410).json({ status: "expired", error: "This QR code expired or was already used" });
    }
    if (row.status !== "approved") return res.json({ status: "pending" });

    // Backward-compatible recovery for QR records created before
    // approvedFirebaseUid was persisted correctly.
    let firebaseUid = row.approvedFirebaseUid;
    if (!firebaseUid && row.approvedUserId) {
      const approvedUser = await User.findById(row.approvedUserId).select("firebaseUid").lean();
      firebaseUid = approvedUser?.firebaseUid || "";
    }
    if (!firebaseUid) {
      console.error("[QR_STATUS_MISSING_APPROVED_UID]", { sessionId: row.sessionId });
      return res.status(409).json({
        status: "error",
        code: "QR_APPROVAL_ACCOUNT_MISSING",
        error: "The approved account could not be found. Please generate a new QR code.",
      });
    }

    const customToken = await admin.auth().createCustomToken(String(firebaseUid));
    return res.json({ status: "approved", customToken });
  } catch (error) {
    // Keep the real cause in Render logs; never return secrets or stack traces.
    console.error("[QR_STATUS_TOKEN_CREATE_FAILED]", {
      code: error.code || "unknown",
      message: error.message || "Unknown Firebase Admin error",
    });
    return res.status(503).json({
      status: "error",
      code: "QR_TOKEN_CREATION_FAILED",
      error: "Firebase could not create the secure sign-in token. Check the Firebase Admin service-account credentials in Render, then try a new QR code.",
    });
  }
});

router.post("/qr/complete", async (req, res) => {
  try {
    const { decoded, user } = await identity(req);
    const sessionId = String(req.body?.sessionId || "");
    if (!sessionId) return res.status(400).json({ error: "Missing QR login session" });

    const row = await QrLogin.findOneAndUpdate(
      {
        sessionId,
        status: "approved",
        expiresAt: { $gt: new Date() },
        $or: [
          { approvedFirebaseUid: decoded.uid },
          { approvedUserId: user._id },
        ],
      },
      { $set: { status: "consumed", consumedAt: new Date() } },
      { new: true }
    );
    if (!row) {
      return res.status(410).json({ error: "QR approval expired, already used, or belongs to another account" });
    }

    const sessionToken = await addSession(user, req.body || {});
    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.recoveryAnswer;
    return res.json({ user: safeUser, sessionToken });
  } catch (error) {
    console.error("[QR_COMPLETE]", error.code || error.message);
    return res.status(error.status || 401).json({ error: error.message || "Unable to complete QR login" });
  }
});

module.exports = router;
