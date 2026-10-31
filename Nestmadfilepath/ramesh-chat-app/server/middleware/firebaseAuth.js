const admin = require("../config/firebaseAdmin");
const User = require("../models/User");

module.exports = async function firebaseAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) return res.status(401).json({ success: false, error: "Authentication required" });

    const decoded = await admin.auth().verifyIdToken(token);
    const user = await User.findOne({ firebaseUid: decoded.uid }).select("_id firebaseUid username email");
    if (!user) return res.status(401).json({ success: false, error: "User account not found" });

    req.auth = decoded;
    req.user = user;
    next();
  } catch (error) {
    console.warn("[AUTH] Firebase token rejected:", error.code || error.message);
    return res.status(401).json({ success: false, error: "Invalid or expired authentication token" });
  }
};
