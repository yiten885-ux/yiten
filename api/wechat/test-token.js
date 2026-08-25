const crypto = require("crypto");
const { clientIp, rateLimited, wechatLimiter } = require("../../lib/rate-limit");
const validate = require("../../assets/validate.js");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json(validate.apiError("method_not_allowed", "Method not allowed", 405));
    return;
  }

  const wechatLimit = await wechatLimiter(clientIp(req));
  if (!wechatLimit.allowed) {
    rateLimited(res, wechatLimit.retryAfterSeconds);
    return;
  }

  const token = process.env.WECHAT_TOKEN;
  if (!token) {
    res.status(503).json(validate.apiError("wechat_not_configured", "verification unavailable", 503));
    return;
  }
  const { signature, timestamp, nonce, echostr } = req.query || {};
  if (!signature || !timestamp || !nonce || !/^[a-f0-9]{40}$/i.test(String(signature))) {
    res.status(403).json(validate.apiError("invalid_signature", "invalid signature", 403));
    return;
  }
  const expected = crypto
    .createHash("sha1")
    .update([token, timestamp, nonce].sort().join(""))
    .digest("hex");

  const signatureBuffer = Buffer.from(String(signature).toLowerCase(), "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (signatureBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    res.status(200).send(echostr || "");
    return;
  }

  res.status(403).json(validate.apiError("invalid_signature", "invalid signature", 403));
};
