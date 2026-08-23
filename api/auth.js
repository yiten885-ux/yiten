// api/auth.js — 认证端点统一入口(login/logout/status)
// Vercel 路由: /api/auth/(.*) -> /api/auth.js?target=$1
// 直接调用时从路径尾部解析 target,便于测试。
const {
  cookieName,
  createSessionValue,
  isAuthConfigured,
  isSameOriginRequest,
  isValidSession,
  parseCookies,
  readJsonBody,
  sessionMaxAgeSeconds,
  setNoStore,
  verifyAdminPassword,
} = require("../lib/auth-shared");
const { clientIp, loginLimiter, rateLimited } = require("../lib/rate-limit");

const handleLogin = async (req, res) => {
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

  const limit = await loginLimiter(clientIp(req));
  if (!limit.allowed) {
    rateLimited(res, limit.retryAfterSeconds);
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

const handleLogout = (req, res) => {
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

const handleStatus = (req, res) => {
  setNoStore(res);
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ authenticated: false, message: "Method not allowed" });
    return;
  }

  const cookies = parseCookies(req.headers.cookie || "");
  res.status(200).json({ authenticated: isValidSession(cookies[cookieName]) });
};

const handlers = { login: handleLogin, logout: handleLogout, status: handleStatus };

module.exports = async function handler(req, res) {
  const search = new URL(req.url, "https://yitenhuang.com").searchParams.get("target");
  const pathMatch = String(req.url || "").match(/\/api\/auth\/([^/?#]+)/);
  const target = search || (pathMatch ? pathMatch[1] : "");
  const selected = handlers[target];
  if (!selected) {
    setNoStore(res);
    res.status(404).json({ ok: false, message: "Unknown auth endpoint." });
    return;
  }
  await selected(req, res);
};
