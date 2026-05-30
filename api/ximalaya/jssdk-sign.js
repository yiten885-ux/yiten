const crypto = require("crypto");

const readBody = (req) =>
  new Promise((resolve, reject) => {
    if (req.body && typeof req.body === "object") return resolve(req.body);
    if (typeof req.body === "string") return resolve(Object.fromEntries(new URLSearchParams(req.body)));
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
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ code: 405, message: "Method not allowed", signature: "" });

  const appKey = process.env.XIMALAYA_APP_KEY;
  const appSecret = process.env.XIMALAYA_APP_SECRET;
  if (!appKey || !appSecret) {
    return res.status(500).json({ code: 500, message: "Missing Ximalaya server credentials", signature: "" });
  }

  try {
    const body = await readBody(req);
    const { client_id: clientId, device_id: deviceId, nonce, timestamp, params } = body;
    if (clientId !== appKey || !deviceId || !nonce || !timestamp || !params) {
      return res.status(400).json({ code: 400, message: "Invalid signature request", signature: "" });
    }
    const parsedParams = JSON.parse(params);
    const signature = signParams(parsedParams, appSecret);
    res.status(200).json({ code: 0, message: "success", signature });
  } catch (error) {
    res.status(400).json({ code: 400, message: error.message || "Signature failed", signature: "" });
  }
};
