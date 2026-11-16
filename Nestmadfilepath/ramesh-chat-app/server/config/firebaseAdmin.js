const admin = require("firebase-admin");

function firstEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizePrivateKey(value) {
  return String(value || "")
    .trim()
    .replace(/^[\"']|[\"']$/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\r\n/g, "\n");
}

// Render projects commonly use either FB_* variables or FIREBASE_* names.
// Also accept a single JSON service-account secret to avoid mismatched names.
function readServiceAccount() {
  const jsonValue = firstEnv("FIREBASE_SERVICE_ACCOUNT_JSON", "FIREBASE_SERVICE_ACCOUNT", "FB_SERVICE_ACCOUNT_JSON");
  let fromJson = {};
  if (jsonValue) {
    try {
      fromJson = JSON.parse(jsonValue);
    } catch (error) {
      throw new Error("Firebase Admin service-account JSON is not valid JSON. Check FIREBASE_SERVICE_ACCOUNT_JSON in Render.");
    }
  }

  return {
    type: fromJson.type || firstEnv("FB_TYPE", "FIREBASE_TYPE") || "service_account",
    project_id: fromJson.project_id || firstEnv("FB_PROJECT_ID", "FIREBASE_PROJECT_ID", "FIREBASE_PROJECTID"),
    private_key_id: fromJson.private_key_id || firstEnv("FB_PRIVATE_KEY_ID", "FIREBASE_PRIVATE_KEY_ID"),
    private_key: normalizePrivateKey(fromJson.private_key || firstEnv("FB_PRIVATE_KEY", "FIREBASE_PRIVATE_KEY")),
    client_email: fromJson.client_email || firstEnv("FB_CLIENT_EMAIL", "FIREBASE_CLIENT_EMAIL"),
    client_id: fromJson.client_id || firstEnv("FB_CLIENT_ID", "FIREBASE_CLIENT_ID"),
    auth_uri: fromJson.auth_uri || firstEnv("FB_AUTH_URI", "FIREBASE_AUTH_URI") || "https://accounts.google.com/o/oauth2/auth",
    token_uri: fromJson.token_uri || firstEnv("FB_TOKEN_URI", "FIREBASE_TOKEN_URI") || "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: fromJson.auth_provider_x509_cert_url || firstEnv("FB_AUTH_PROVIDER_X509_CERT_URL", "FIREBASE_AUTH_PROVIDER_X509_CERT_URL"),
    client_x509_cert_url: fromJson.client_x509_cert_url || firstEnv("FB_CLIENT_X509_CERT_URL", "FIREBASE_CLIENT_X509_CERT_URL"),
    universe_domain: fromJson.universe_domain || firstEnv("FB_UNIVERSE_DOMAIN", "FIREBASE_UNIVERSE_DOMAIN") || "googleapis.com",
  };
}

if (!admin.apps.length) {
  const serviceAccount = readServiceAccount();
  const missing = ["project_id", "private_key", "client_email"].filter(
    (field) => !serviceAccount[field]
  );

  if (missing.length) {
    throw new Error(
      "Firebase Admin configuration is missing required service-account fields: " +
      missing.join(", ") +
      ". Configure FB_* or FIREBASE_* variables, or FIREBASE_SERVICE_ACCOUNT_JSON, in Render."
    );
  }

  if (!serviceAccount.private_key.includes("-----BEGIN PRIVATE KEY-----")) {
    throw new Error("Firebase Admin private key is not a valid PEM private key. Recheck the Firebase service-account private key in Render.");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

module.exports = admin;
