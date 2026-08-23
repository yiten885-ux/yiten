const crypto = require("node:crypto");

const cookieName = "__Host-yiten_admin";
const sessionMaxAgeSeconds = 12 * 60 * 60;
const sessionMaxAgeMs = sessionMaxAgeSeconds * 1000;
const minimumPasswordLength = 12;
const minimumSecretLength = 32;
const defaultMaxJsonBytes = 16 * 1024;

const getAuthConfiguration = () => {
  const password = String(process.env.ADMIN_PASSWORD || "");
  const secret = String(process.env.AUTH_SECRET || "");
  return {
    password,
    secret,
    configured: password.length >= minimumPasswordLength && secret.length >= minimumSecretLength,
  };
};

const isAuthConfigured = () => getAuthConfiguration().configured;

const secureEqual = (left, right) => {
  const leftDigest = crypto.createHash("sha256").update(String(left)).digest();
  const rightDigest = crypto.createHash("sha256").update(String(right)).digest();
  return crypto.timingSafeEqual(leftDigest, rightDigest);
};

const verifyAdminPassword = (candidate) => {
  const configuration = getAuthConfiguration();
  return configuration.configured && secureEqual(candidate, configuration.password);
};

const sign = (value, secret) => crypto.createHmac("sha256", secret).update(value).digest("hex");

const createSessionValue = (issuedAt = Date.now()) => {
  const configuration = getAuthConfiguration();
  if (!configuration.configured) {
    const error = new Error("Admin authentication is not configured.");
    error.code = "auth_not_configured";
    error.status = 503;
    throw error;
  }
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = `admin.${issuedAt}.${nonce}`;
  return `${payload}.${sign(payload, configuration.secret)}`;
};

const decodeCookiePart = (value) => {
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return value;
  }
};

const parseCookies = (header = "") =>
  Object.fromEntries(
    String(header)
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const index = cookie.indexOf("=");
        return index >= 0
          ? [decodeCookiePart(cookie.slice(0, index)), decodeCookiePart(cookie.slice(index + 1))]
          : [decodeCookiePart(cookie), ""];
      })
  );

const isValidSession = (value = "", now = Date.now()) => {
  const configuration = getAuthConfiguration();
  if (!configuration.configured) return false;
  const parts = String(value).split(".");
  if (parts.length !== 4 || parts[0] !== "admin") return false;
  const issuedAt = Number(parts[1]);
  if (!Number.isSafeInteger(issuedAt) || !Number.isFinite(now)) return false;
  const age = now - issuedAt;
  if (age < 0 || age >= sessionMaxAgeMs) return false;
  const payload = `${parts[0]}.${parts[1]}.${parts[2]}`;
  return secureEqual(sign(payload, configuration.secret), parts[3]);
};

const jsonBodyError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const readJsonBody = (req, maxBytes = defaultMaxJsonBytes) =>
  new Promise((resolve, reject) => {
    if (req.body && typeof req.body === "object") {
      const size = Buffer.byteLength(JSON.stringify(req.body));
      if (size > maxBytes) return reject(jsonBodyError("Request body is too large.", 413));
      return resolve(req.body);
    }
    if (typeof req.body === "string") {
      if (Buffer.byteLength(req.body) > maxBytes) return reject(jsonBodyError("Request body is too large.", 413));
      try {
        return resolve(JSON.parse(req.body || "{}"));
      } catch (_error) {
        return reject(jsonBodyError("Request body must be valid JSON."));
      }
    }

    let raw = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > maxBytes) {
        reject(jsonBodyError("Request body is too large.", 413));
        return;
      }
      raw += chunk;
    });
    req.on("end", () => {
      if (size > maxBytes) return;
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (_error) {
        reject(jsonBodyError("Request body must be valid JSON."));
      }
    });
    req.on("error", reject);
  });

const setNoStore = (res) => {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
};

const isSameOriginRequest = (req) => {
  const origin = String(req.headers?.origin || "").trim();
  const forwardedHost = String(req.headers?.["x-forwarded-host"] || req.headers?.host || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  if (!origin || !forwardedHost) return false;
  try {
    const parsed = new URL(origin);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.host.toLowerCase() !== forwardedHost) return false;
    const forwardedProtocol = String(req.headers?.["x-forwarded-proto"] || "").split(",")[0].trim();
    return !forwardedProtocol || `${forwardedProtocol}:` === parsed.protocol;
  } catch (_error) {
    return false;
  }
};

const requireAdminRequest = (req, res, { sameOrigin = false } = {}) => {
  if (!isAuthConfigured()) {
    res.status(503).json({ ok: false, code: "auth_not_configured", message: "后台认证尚未安全配置。" });
    return false;
  }
  const cookies = parseCookies(req.headers?.cookie || "");
  if (!isValidSession(cookies[cookieName])) {
    res.status(401).json({ ok: false, code: "authentication_required", message: "需要后台登录。" });
    return false;
  }
  if (sameOrigin && !isSameOriginRequest(req)) {
    res.status(403).json({ ok: false, code: "origin_forbidden", message: "请求来源无效。" });
    return false;
  }
  return true;
};

module.exports = {
  cookieName,
  createSessionValue,
  isAuthConfigured,
  isSameOriginRequest,
  isValidSession,
  parseCookies,
  readJsonBody,
  requireAdminRequest,
  sessionMaxAgeSeconds,
  setNoStore,
  verifyAdminPassword,
};
