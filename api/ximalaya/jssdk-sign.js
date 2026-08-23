const crypto = require("crypto");
const { isSameOriginRequest, setNoStore } = require("../../lib/auth-shared");

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
    res.status(405).json({ code: 405, message: "Method not allowed", signature: "" });
    return;
  }

  if (process.env.XIMALAYA_SIGNING_ENABLED !== "true") {
    res.status(503).json({ code: 503, message: "Signing service is disabled", signature: "" });
    return;
  }
  if (!isSameOriginRequest(req)) {
    res.status(403).json({ code: 403, message: "Invalid request origin", signature: "" });
    return;
  }

  const appKey = process.env.XIMALAYA_APP_KEY;
  const appSecret = process.env.XIMALAYA_APP_SECRET;

  if (!appKey || !appSecret) {
    res.status(500).json({ code: 500, message: "Missing Ximalaya server credentials", signature: "" });
    return;
  }

  try {
    const body = await readBody(req);
    const { client_id: clientId, device_id: deviceId, nonce, timestamp, params } = body;

    if (clientId !== appKey || !deviceId || !nonce || !timestamp || !params) {
      res.status(400).json({ code: 400, message: "Invalid signature request", signature: "" });
      return;
    }

    if (!/^[A-Za-z0-9_-]{8,128}$/.test(String(nonce))) {
      res.status(400).json({ code: 400, message: "Invalid nonce", signature: "" });
      return;
    }
    const timestampNumber = Number(timestamp);
    if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() - timestampNumber) > 5 * 60 * 1000) {
      res.status(400).json({ code: 400, message: "Invalid timestamp", signature: "" });
      return;
    }
    if (Buffer.byteLength(String(params)) > 32 * 1024) {
      res.status(413).json({ code: 413, message: "Signing payload is too large", signature: "" });
      return;
    }
    const parsedParams = JSON.parse(params);
    if (!parsedParams || typeof parsedParams !== "object" || Array.isArray(parsedParams) || Object.keys(parsedParams).length > 50) {
      res.status(400).json({ code: 400, message: "Invalid signature params", signature: "" });
      return;
    }
    const signature = signParams(parsedParams, appSecret);
    res.status(200).json({ code: 0, message: "success", signature });
  } catch (error) {
    res.status(400).json({ code: 400, message: error.message || "Signature failed", signature: "" });
  }
};
