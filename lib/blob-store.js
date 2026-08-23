const crypto = require("node:crypto");

const blobApiBase = process.env.VERCEL_BLOB_API_URL || "https://vercel.com/api/blob";
const apiVersion = process.env.VERCEL_BLOB_API_VERSION_OVERRIDE || "12";

const getMediaToken = () => process.env.BLOB_READ_WRITE_TOKEN || "";
const getStateToken = () =>
  process.env.YITEN_STATE_READ_WRITE_TOKEN ||
  process.env.STATE_BLOB_READ_WRITE_TOKEN ||
  process.env.BLOB_READ_WRITE_TOKEN ||
  "";
const getToken = (token) => token || getMediaToken();

const getStoreId = (token) => {
  const effectiveToken = getToken(token);
  const [, , , storeId = ""] = effectiveToken.split("_");
  return storeId;
};

const isConfigured = (token) => Boolean(getToken(token) && getStoreId(token));
const isMediaConfigured = () => isConfigured(getMediaToken());
const isStateConfigured = () => isConfigured(getStateToken());

const safePathSegment = (value = "file") =>
  String(value)
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "file";

const extensionFromName = (fileName = "") => {
  const clean = String(fileName).split(/[\\/]/).pop() || "";
  const match = clean.match(/(\.[a-z0-9]{1,10})$/i);
  return match ? match[1].toLowerCase() : "";
};

const pathnameForUpload = ({ folder = "uploads", fileName = "file" } = {}) => {
  const safeFolder = safePathSegment(folder);
  const ext = extensionFromName(fileName);
  const base = safePathSegment(String(fileName).replace(/\.[^.]+$/, ""));
  const stamp = new Date().toISOString().slice(0, 10);
  const nonce = crypto.randomBytes(6).toString("hex");
  return `uploads/${safeFolder}/${stamp}/${Date.now()}-${nonce}-${base}${ext}`;
};

const blobHeaders = (extra = {}, token) => ({
  Authorization: `Bearer ${getToken(token)}`,
  "x-api-version": apiVersion,
  "x-api-blob-request-id": `${getStoreId(token)}:${Date.now()}:${crypto.randomBytes(4).toString("hex")}`,
  ...extra,
});

const requestBlobApi = async (pathname, init = {}, token) => {
  if (!isConfigured(token)) {
    const error = new Error("Blob read-write token is not configured.");
    error.code = "blob_not_configured";
    throw error;
  }

  const response = await fetch(`${blobApiBase}${pathname}`, {
    ...init,
    headers: blobHeaders(init.headers || {}, token),
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_error) {
      data = { raw: text };
    }
  }
  if (!response.ok) {
    const message = data?.error?.message || data?.message || `Blob request failed with ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data || {};
};

const putBlob = async ({ pathname, body, contentType = "application/octet-stream", access = "public", allowOverwrite = false, token }) => {
  const search = new URLSearchParams({ pathname });
  return requestBlobApi(`/?${search.toString()}`, {
    method: "PUT",
    body,
    headers: {
      "x-vercel-blob-access": access,
      "x-content-type": contentType,
      "x-add-random-suffix": "0",
      "x-allow-overwrite": allowOverwrite ? "1" : "0",
      "x-content-length": String(Buffer.isBuffer(body) ? body.length : Buffer.byteLength(String(body || ""))),
    },
  }, token);
};

const privateBlobUrl = (pathname, token) => `https://${getStoreId(token)}.private.blob.vercel-storage.com/${pathname}`;

const getPrivateText = async (pathname, token) => {
  if (!isConfigured(token)) {
    const error = new Error("Blob read-write token is not configured.");
    error.code = "blob_not_configured";
    throw error;
  }
  const response = await fetch(privateBlobUrl(pathname, token), {
    headers: {
      Authorization: `Bearer ${getToken(token)}`,
      "x-api-version": apiVersion,
    },
  });
  if (response.status === 404) return "";
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Private blob read failed with ${response.status}`);
  }
  return response.text();
};

module.exports = {
  getMediaToken,
  getPrivateText,
  getStateToken,
  isConfigured,
  isMediaConfigured,
  isStateConfigured,
  pathnameForUpload,
  putBlob,
};
