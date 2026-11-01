const admin = require("firebase-admin");

// Use the existing Render service-account environment variables.
// Support both escaped newline values and real multiline private keys.
const rawPrivateKey = (process.env.FB_PRIVATE_KEY || "")
  .trim()
  .replace(/^["']|["']$/g, "");
const privateKey = rawPrivateKey
  .replace(/\\n/g, "\n")
  .replace(/\r\n/g, "\n");

const serviceAccount = {
  type: process.env.FB_TYPE,
  project_id: process.env.FB_PROJECT_ID,
  private_key_id: process.env.FB_PRIVATE_KEY_ID,
  private_key: privateKey,
  client_email: process.env.FB_CLIENT_EMAIL,
  client_id: process.env.FB_CLIENT_ID,
  auth_uri: process.env.FB_AUTH_URI,
  token_uri: process.env.FB_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FB_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FB_CLIENT_X509_CERT_URL,
  universe_domain: process.env.FB_UNIVERSE_DOMAIN,
};

if (!admin.apps.length) {
  const missing = ["project_id", "private_key", "client_email"].filter(
    (field) => !serviceAccount[field]
  );
  if (missing.length) {
    throw new Error(
      "Firebase Admin configuration is missing existing Render values: " +
      missing.join(", ")
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

module.exports = admin;
