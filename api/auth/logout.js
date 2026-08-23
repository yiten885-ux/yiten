const { cookieName, isSameOriginRequest, setNoStore } = require("../../lib/auth-shared");

module.exports = function handler(req, res) {
  setNoStore(res);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ ok: false, message: "Method not allowed" });
    return;
  }

  if (!isSameOriginRequest(req)) {
    res.status(403).json({ ok: false, code: "origin_forbidden", message: "请求来源无效。" });
    return;
  }

  res.setHeader("Set-Cookie", `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
  res.status(200).json({ ok: true });
};
