
const admin = require("firebase-admin");
const fs    = require("fs");

// Path to your service account JSON, set in .env as FB_ADMIN_CRED
const keyPath = process.env.FB_ADMIN_CRED;
if (!keyPath) throw new Error("Missing FB_ADMIN_CRED environment variable");

// Load and parse service account credentials
const serviceJson = JSON.parse(
  fs.readFileSync(keyPath, { encoding: "utf8" })
);

// Initialize the default app only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceJson),
  });
}

module.exports = admin;
