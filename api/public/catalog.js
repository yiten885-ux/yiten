const { setNoStore } = require("../../lib/auth-shared");
const { projectPublicCatalog, readState } = require("../../lib/site-state");
const { catalogLimiter, clientIp, rateLimited } = require("../../lib/rate-limit");

module.exports = async function handler(req, res) {
  setNoStore(res);
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ ok: false, message: "Method not allowed" });
    return;
  }

  const limit = await catalogLimiter(clientIp(req));
  if (!limit.allowed) {
    rateLimited(res, limit.retryAfterSeconds);
    return;
  }

  try {
    const catalog = projectPublicCatalog(await readState());
    res.status(200).json({ ok: true, ...catalog });
  } catch (_error) {
    res.status(503).json({ ok: false, message: "公开内容暂时不可用。" });
  }
};
