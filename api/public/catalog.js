// api/public/catalog.js — 公共目录(样板:统一校验层 + 统一错误契约)
// 成功: { ok:true, works, products, contact, viewCounts, savedAt }(经 assets/validate.js 规范化)
// 失败: { ok:false, error:{ code, message } }
const { setNoStore } = require("../../lib/auth-shared");
const { projectPublicCatalog, readState } = require("../../lib/site-state");
const { catalogLimiter, clientIp, rateLimited } = require("../../lib/rate-limit");
const validate = require("../../assets/validate.js");

module.exports = async function handler(req, res) {
  setNoStore(res);
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json(validate.apiError("method_not_allowed", "Method not allowed", 405));
    return;
  }

  const limit = await catalogLimiter(clientIp(req));
  if (!limit.allowed) {
    rateLimited(res, limit.retryAfterSeconds);
    return;
  }

  try {
    const catalog = projectPublicCatalog(await readState());
    const normalized = validate.catalogResponse({ ok: true, ...catalog });
    if (!normalized) {
      res.status(503).json(validate.apiError("bad_catalog_shape", "目录数据结构异常。", 503));
      return;
    }
    res.status(200).json(normalized);
  } catch (_error) {
    res.status(503).json(validate.apiError("catalog_unavailable", "公开内容暂时不可用。", 503));
  }
};
