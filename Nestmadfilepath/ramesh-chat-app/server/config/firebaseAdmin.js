
// const admin = require("firebase-admin");
// const fs    = require("fs");

// // Path to your service account JSON, set in .env as FB_ADMIN_CRED
// const keyPath = process.env.FB_ADMIN_CRED;
// if (!keyPath) throw new Error("Missing FB_ADMIN_CRED environment variable");

// // Load and parse service account credentials
// const serviceJson = JSON.parse(
//   fs.readFileSync(keyPath, { encoding: "utf8" })
// );

// // Initialize the default app only once
// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceJson),
//   });
// }

// module.exports = admin;



const admin = require("firebase-admin");

// Build service account object from .env
const serviceAccount = {
  type: process.env.FB_TYPE,
  project_id: process.env.FB_PROJECT_ID,
  private_key_id: process.env.FB_PRIVATE_KEY_ID,
  private_key: process.env.FB_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FB_CLIENT_EMAIL,
  client_id: process.env.FB_CLIENT_ID,
  auth_uri: process.env.FB_AUTH_URI,
  token_uri: process.env.FB_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FB_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FB_CLIENT_X509_CERT_URL,
  universe_domain: process.env.FB_UNIVERSE_DOMAIN,
};

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;
