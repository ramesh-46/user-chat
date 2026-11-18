const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const crypto = require("crypto");

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "chat-media";
let client;

function getClient() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const error = new Error("Supabase media storage is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY in the backend environment.");
    error.code = "MEDIA_STORAGE_NOT_CONFIGURED";
    throw error;
  }
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return client;
}

function safeSegment(value) {
  return String(value || "unknown").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100);
}

async function verifyStorageConnection() {
  const supabase = getClient();
  const { data, error } = await supabase.storage.getBucket(BUCKET);
  if (error) {
    const connectionError = new Error(error.message || "Unable to access the configured Supabase bucket.");
    connectionError.code = error.statusCode || error.status || "SUPABASE_BUCKET_CHECK_FAILED";
    throw connectionError;
  }
  if (!data?.id) throw new Error("Supabase responded, but the configured storage bucket was not found.");
  return { connected: true, bucket: BUCKET };
}

async function uploadMedia(file, folder) {
  if (!file?.buffer || !file.mimetype) throw new Error("A valid media file is required.");
  if (file.size > MAX_FILE_SIZE) {
    const error = new Error("File is too large (100 MB maximum).");
    error.code = "LIMIT_FILE_SIZE";
    throw error;
  }
  const ext = path.extname(file.originalname || "").toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 12);
  const safeFolder = String(folder || "uploads").split("/").map(safeSegment).join("/");
  const objectPath = `${safeFolder}/${Date.now()}-${crypto.randomUUID()}${ext}`;
  const { error } = await getClient().storage.from(BUCKET).upload(objectPath, file.buffer, {
    contentType: file.mimetype, cacheControl: "3600", upsert: false
  });
  if (error) throw new Error(`Supabase upload failed: ${error.message}`);
  return { path: objectPath, bucket: BUCKET, size: file.size, mime: file.mimetype };
}

async function deleteMedia(objectPath) {\n  if (!objectPath || typeof objectPath !== "string") return;\n  const { error } = await getClient().storage.from(BUCKET).remove([objectPath]);\n  if (error) throw new Error(`Supabase media delete failed: ${error.message}`);\n}\n\nasync function createMediaUrl(objectPath, expiresIn = 300) {
  if (!objectPath || typeof objectPath !== "string") throw new Error("Invalid media storage path.");
  const { data, error } = await getClient().storage.from(BUCKET).createSignedUrl(objectPath, expiresIn);
  if (error || !data?.signedUrl) throw new Error(`Unable to create media URL: ${error?.message || "No signed URL returned"}`);
  return data.signedUrl;
}

module.exports = { uploadMedia, createMediaUrl, deleteMedia, verifyStorageConnection };
