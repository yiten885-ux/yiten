const {
  cookieName,
  createSessionValue,
  isAuthConfigured,
  isSameOriginRequest,
  readJsonBody,
  sessionMaxAgeSeconds,
  setNoStore,
  verifyAdminPassword,
} = require("../../lib/auth-shared");

module.exports = async function handler(req, res) {
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
  if (!isAuthConfigured()) {
    res.status(503).json({ ok: false, code: "auth_not_configured", message: "后台认证尚未安全配置。" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const password = String(body.password || "");
    if (!password || !verifyAdminPassword(password)) {
      res.status(401).json({ ok: false, message: "后台口令不正确" });
      return;
    }

    res.setHeader(
      "Set-Cookie",
      `${cookieName}=${encodeURIComponent(createSessionValue())}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${sessionMaxAgeSeconds}`
    );
    res.status(200).json({ ok: true, maxAgeSeconds: sessionMaxAgeSeconds });
  } catch (error) {
    const status = Number(error.status) || 500;
    res.status(status).json({ ok: false, message: status < 500 ? error.message : "登录服务暂时不可用。" });
  }
};
