const crypto = require("crypto");

module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).send("Method not allowed");
    return;
  }

  const token = process.env.WECHAT_TOKEN;
  if (!token) {
    res.status(503).send("verification unavailable");
    return;
  }
  const { signature, timestamp, nonce, echostr } = req.query || {};
  if (!signature || !timestamp || !nonce || !/^[a-f0-9]{40}$/i.test(String(signature))) {
    res.status(403).send("invalid signature");
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

  res.status(403).send("invalid signature");
};
