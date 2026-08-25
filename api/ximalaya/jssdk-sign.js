const crypto = require("crypto");
const { isSameOriginRequest, setNoStore } = require("../../lib/auth-shared");
const { clientIp, rateLimited, signLimiter } = require("../../lib/rate-limit");
const validate = require("../../assets/validate.js");

// 旧契约保留 signature:"" 兼容前端;错误结构统一为 { ok:false, ... }。
const signedError = (code, message, status) => ({ ...validate.apiError(code, message, status), signature: "" });

const readBody = (req) =>
  new Promise((resolve, reject) => {
    if (req.body && typeof req.body === "object") {
      resolve(req.body);
      return;
    }

    if (typeof req.body === "string") {
      resolve(Object.fromEntries(new URLSearchParams(req.body)));
      return;
    }

    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => resolve(Object.fromEntries(new URLSearchParams(raw))));
    req.on("error", reject);
  });

const signParams = (params, appSecret) => {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  const base64Encoded = Buffer.from(sorted, "utf8").toString("base64");
  const sha1Bytes = crypto.createHmac("sha1", appSecret).update(base64Encoded).digest();
  return crypto.createHash("md5").update(sha1Bytes).digest("hex");
};

module.exports = async function handler(req, res) {
  setNoStore(res);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json(signedError("method_not_allowed", "Method not allowed", 405));
    return;
  }

  const signLimit = await signLimiter(clientIp(req));
  if (!signLimit.allowed) {
    rateLimited(res, signLimit.retryAfterSeconds);
    return;
  }

  if (process.env.XIMALAYA_SIGNING_ENABLED !== "true") {
    res.status(503).json(signedError("signing_disabled", "Signing service is disabled", 503));
    return;
  }
  if (!isSameOriginRequest(req)) {
    res.status(403).json(signedError("origin_forbidden", "Invalid request origin", 403));
    return;
  }

  const appKey = process.env.XIMALAYA_APP_KEY;
  const appSecret = process.env.XIMALAYA_APP_SECRET;

  if (!appKey || !appSecret) {
    res.status(500).json(signedError("signing_not_configured", "Missing Ximalaya server credentials", 500));
    return;
  }

  try {
    const body = await readBody(req);
    const { client_id: clientId, device_id: deviceId, nonce, timestamp, params } = body;

    if (clientId !== appKey || !deviceId || !nonce || !timestamp || !params) {
      res.status(400).json(signedError("invalid_sign_request", "Invalid signature request", 400));
      return;
    }

    if (!/^[A-Za-z0-9_-]{8,128}$/.test(String(nonce))) {
      res.status(400).json(signedError("invalid_nonce", "Invalid nonce", 400));
      return;
    }
    const timestampNumber = Number(timestamp);
    if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() - timestampNumber) > 5 * 60 * 1000) {
      res.status(400).json(signedError("invalid_timestamp", "Invalid timestamp", 400));
      return;
    }
    if (Buffer.byteLength(String(params)) > 32 * 1024) {
      res.status(413).json(signedError("sign_payload_too_large", "Signing payload is too large", 413));
      return;
    }
    const parsedParams = JSON.parse(params);
    if (!parsedParams || typeof parsedParams !== "object" || Array.isArray(parsedParams) || Object.keys(parsedParams).length > 50) {
      res.status(400).json(signedError("invalid_sign_params", "Invalid signature params", 400));
      return;
    }
    const signature = signParams(parsedParams, appSecret);
    res.status(200).json({ code: 0, message: "success", signature });
  } catch (error) {
    res.status(400).json(signedError("signature_failed", error.message || "Signature failed", 400));
  }
};
