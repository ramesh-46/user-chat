"use strict";

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

/**
 * Firebase Admin must be initialized exactly once and shared by every route
 * and Socket.IO handler. Never log private-key material.
 */
function normalizePrivateKey(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Firebase service-account private key is missing. Set FB_PRIVATE_KEY in Render.");
  }

  let key = value.trim();

  // Render values are commonly pasted with surrounding quotes.
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  // Support both real line breaks and the literal characters backslash+n.
  key = key
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  // Remove accidental blank whitespace around PEM boundaries only.
  if (!key.includes("-----BEGIN PRIVATE KEY-----") ||
      !key.includes("-----END PRIVATE KEY-----")) {
    throw new Error(
      "Firebase private key is not a valid PEM service-account key. Copy the complete private_key value from your Google service-account JSON into Render's FB_PRIVATE_KEY variable."
    );
  }

  return key.endsWith("\n") ? key : key + "\n";
}

function readServiceAccount() {
  // Preferred option: store the complete service-account JSON in one
  // environment variable. Supports compact JSON or a JSON string.
  const jsonValue =
    process.env.FB_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (jsonValue && jsonValue.trim()) {
    let parsed;
    try {
      parsed = JSON.parse(jsonValue.trim());
      // Some hosting dashboards store the JSON itself as a quoted string.
      if (typeof parsed === "string") parsed = JSON.parse(parsed);
    } catch (error) {
      throw new Error("FB_SERVICE_ACCOUNT_JSON is not valid JSON: " + error.message);
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("FB_SERVICE_ACCOUNT_JSON must contain a service-account JSON object.");
    }

    return {
      ...parsed,
      private_key: normalizePrivateKey(parsed.private_key),
    };
  }

  // Backwards-compatible option: a path to a service-account JSON file.
  const credentialPath = process.env.FB_ADMIN_CRED;
  if (credentialPath && credentialPath.trim()) {
    const resolvedPath = path.resolve(credentialPath.trim());
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
    } catch (error) {
      throw new Error("Unable to read FB_ADMIN_CRED service-account file: " + error.message);
    }

    return {
      ...parsed,
      private_key: normalizePrivateKey(parsed.private_key),
    };
  }

  // Backwards-compatible option: individual Render environment variables.
  const serviceAccount = {
    type: process.env.FB_TYPE || "service_account",
    project_id: process.env.FB_PROJECT_ID,
    private_key_id: process.env.FB_PRIVATE_KEY_ID,
    private_key: normalizePrivateKey(process.env.FB_PRIVATE_KEY),
    client_email: process.env.FB_CLIENT_EMAIL,
    client_id: process.env.FB_CLIENT_ID,
    auth_uri: process.env.FB_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
    token_uri: process.env.FB_TOKEN_URI || "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url:
      process.env.FB_AUTH_PROVIDER_X509_CERT_URL ||
      "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FB_CLIENT_X509_CERT_URL,
    universe_domain: process.env.FB_UNIVERSE_DOMAIN || "googleapis.com",
  };

  const required = ["project_id", "private_key_id", "client_email"];
  const missing = required.filter((field) => !serviceAccount[field]);
  if (missing.length) {
    throw new Error(
      "Missing Firebase Render environment variables: " +
      missing.map((field) => ({
        project_id: "FB_PROJECT_ID",
        private_key_id: "FB_PRIVATE_KEY_ID",
        client_email: "FB_CLIENT_EMAIL",
      })[field]).join(", ")
    );
  }

  return serviceAccount;
}

if (!admin.apps.length) {
  const serviceAccount = readServiceAccount();

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    console.log("[FIREBASE_ADMIN] Initialized successfully for project:", serviceAccount.project_id);
  } catch (error) {
    // Do not print the service account or private key.
    console.error("[FIREBASE_ADMIN] Initialization failed:", error.message);
    throw error;
  }
}

module.exports = admin;
