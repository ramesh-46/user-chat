const admin = require("../config/firebaseAdmin");
const User = require("../models/User");
const LoginSession = require("../models/LoginSession");
const crypto = require("crypto");

module.exports = async function firebaseAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) return res.status(401).json({ success: false, error: "Authentication required" });

    const decoded = await admin.auth().verifyIdToken(token);
    const user = await User.findOne({ firebaseUid: decoded.uid }).select("_id firebaseUid username email");
    if (!user) return res.status(401).json({ success: false, error: "User account not found" });

    const deviceToken = String(req.headers["x-device-session"] || "");
    if (deviceToken) {
      const tokenHash = crypto.createHash("sha256").update(deviceToken).digest("hex");
      const session = await LoginSession.findOne({ tokenHash, userId: user._id, revokedAt: null, expiresAt: { $gt: new Date() } }).select("_id");
      if (!session) return res.status(401).json({ success: false, error: "This device session was revoked. Sign in again." });
      await LoginSession.updateOne({ _id: session._id }, { $set: { lastActiveAt: new Date() } });
    }
    req.auth = decoded;
    req.user = user;
    next();
  } catch (error) {
    console.warn("[AUTH] Firebase token rejected:", error.code || error.message);
    return res.status(401).json({ success: false, error: "Invalid or expired authentication token" });
  }
};
