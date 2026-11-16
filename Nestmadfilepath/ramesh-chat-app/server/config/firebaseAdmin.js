const admin = require("firebase-admin");
const crypto = require("crypto");

function firstEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizePrivateKey(value) {
  let key = String(value || "").replace(/^\uFEFF/, "").trim();

  // Accept a JSON-stringified PEM or a service-account JSON object accidentally
  // placed in FB_PRIVATE_KEY. Never log the secret while parsing it.
  if (key.startsWith('"') && key.endsWith('"')) {
    try {
      const parsed = JSON.parse(key);
      if (typeof parsed === "string") key = parsed;
    } catch (_) {
      key = key.slice(1, -1);
    }
  }

  if (key.startsWith("{")) {
    try {
      const parsed = JSON.parse(key);
      if (typeof parsed.private_key === "string") key = parsed.private_key;
    } catch (_) {
      // Leave malformed input untouched so validation below reports it safely.
    }
  }

  // Render may store PEM newlines as literal backslash-n sequences.
  key = key
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();

  // Also accept a base64-encoded PEM, but only decode when it really contains
  // a PEM header; arbitrary values are never treated as valid keys.
  if (!key.includes("-----BEGIN") && /^[A-Za-z0-9+/=\\s]+$/.test(key)) {
    try {
      const decoded = Buffer.from(key.replace(/\\s/g, ""), "base64").toString("utf8");
      if (decoded.includes("-----BEGIN") && decoded.includes("PRIVATE KEY-----")) {
        key = decoded.trim();
      }
    } catch (_) {
      // Keep original value; createPrivateKey below will reject it.
    }
  }

  return key;
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

  // Validate the PEM cryptographically at startup. A BEGIN marker alone does not
  // prove that the key is complete, parseable, or usable by the Admin SDK.
  try {
    const parsedKey = crypto.createPrivateKey(serviceAccount.private_key);
    if (parsedKey.asymmetricKeyType !== "rsa") {
      throw new Error("Firebase service-account keys must use RSA.");
    }
  } catch (error) {
    throw new Error(
      "Firebase Admin private key is invalid or incomplete. In Render, replace it with the private_key from a newly generated Firebase service-account JSON file. (" +
      String(error.message || "Invalid PEM").slice(0, 160) +
      ")"
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.iam\.gserviceaccount\.com$/.test(serviceAccount.client_email)) {
    throw new Error("Firebase Admin client_email is not a Google service-account email. Check the service-account JSON configured in Render.");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

module.exports = admin;
