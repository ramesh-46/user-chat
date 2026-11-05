const admin = require("../config/firebaseAdmin");
const User = require("../models/User");
const asData = (value) => Object.fromEntries(Object.entries(value || {}).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)]));
async function sendPushToUsers(userIds, payload) {
  try {
    const ids = [...new Set((userIds || []).map(String).filter(Boolean))];
    if (!ids.length) return;
    const users = await User.find({ _id: { $in: ids } }).select("_id fcmToken fcmTokens");
    const jobs = [];
    for (const user of users) for (const token of new Set([...(user.fcmTokens || []), user.fcmToken].filter(Boolean))) jobs.push({ userId: String(user._id), token });
    if (!jobs.length) return;
    const response = await admin.messaging().sendEach(jobs.map(({ token }) => ({
      token,
      data: asData({ title: payload.title || "SURA Chat", body: payload.body || "You have a new notification", ...payload.data }),
      webpush: { headers: { TTL: String(payload.ttl || 3600), Urgency: payload.urgency || "high" } }
    })));
    const invalid = [];
    response.responses.forEach((r, i) => {
      if (!r.success && ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(r.error?.code)) invalid.push(jobs[i].token);
      else if (!r.success) console.warn("[PUSH_SEND]", r.error?.code || r.error?.message);
    });
    if (invalid.length) await User.updateMany({}, { $pull: { fcmTokens: { $in: invalid }, fcmToken: { $in: invalid } } });
  } catch (error) { console.error("[PUSH_DELIVERY]", error.code || error.message); }
}
const sendPushToUser = (id, payload) => sendPushToUsers([id], payload);
module.exports = { sendPushToUser, sendPushToUsers };
