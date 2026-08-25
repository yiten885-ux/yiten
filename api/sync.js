const {
  isMediaConfigured,
  pathnameForUpload,
  putBlob,
} = require("../lib/blob-store");
const {
  isSameOriginRequest,
  readJsonBody,
  requireAdminRequest,
  setNoStore,
} = require("../lib/auth-shared");
const {
  isPrivateKey,
  projectPublicCatalog,
  readState,
  serializePrivateState,
  writeState,
} = require("../lib/site-state");
const { clientIp, rateLimited, uploadLimiter, viewLimiter } = require("../lib/rate-limit");
const validate = require("../assets/validate.js");

const maxUploadBytes = 35 * 1024 * 1024;
const maxStateBodyBytes = 2 * 1024 * 1024;
const maxStateValueBytes = 1024 * 1024;
const maxStateKeysPerRequest = 100;
const allowedUploadFolders = new Set(["audio", "images", "works/covers"]);
const allowedUploadTypes = new Map([
  ["audio/mpeg", new Set([".mp3"])],
  ["audio/mp4", new Set([".m4a", ".mp4"])],
  ["audio/wav", new Set([".wav"])],
  ["image/jpeg", new Set([".jpg", ".jpeg"])],
  ["image/png", new Set([".png"])],
  ["image/webp", new Set([".webp"])],
  ["image/gif", new Set([".gif"])],
]);

const extensionFromName = (fileName) => {
  const match = String(fileName || "").toLowerCase().match(/(\.[a-z0-9]{1,10})$/);
  return match ? match[1] : "";
};

const readRawBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let rejected = false;
    req.on("data", (chunk) => {
      if (rejected) return;
      size += chunk.length;
      if (size > maxUploadBytes) {
        rejected = true;
        const error = new Error("文件超过当前上传限制。");
        error.status = 413;
        reject(error);
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!rejected) resolve(Buffer.concat(chunks));
    });
    req.on("error", reject);
  });

const handleState = async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    res.status(405).json(validate.apiError("method_not_allowed", "Method not allowed", 405));
    return;
  }

  if (!requireAdminRequest(req, res, { sameOrigin: req.method === "POST" })) return;

  if (req.method === "GET") {
    const state = await readState();
    const since = new URL(req.url, "https://yitenhuang.com").searchParams.get("since");
    if (since && state.savedAt && since === state.savedAt) {
      res.status(200).json({ ok: true, unchanged: true, savedAt: state.savedAt });
      return;
    }
    res.status(200).json({ ok: true, ...serializePrivateState(state) });
    return;
  }

  const body = await readJsonBody(req, maxStateBodyBytes);
  const incoming = body.items;
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    res.status(400).json(validate.apiError("invalid_state_items", "items must be an object.", 400));
    return;
  }
  const entries = Object.entries(incoming);
  if (!entries.length || entries.length > maxStateKeysPerRequest) {
    res.status(400).json(validate.apiError("invalid_state_keys", "Invalid number of state keys.", 400));
    return;
  }
  for (const [key, value] of entries) {
    if (!isPrivateKey(key)) {
      res.status(400).json(validate.apiError("unknown_state_key", "Unknown state key.", 400));
      return;
    }
    if (Buffer.byteLength(String(value ?? "")) > maxStateValueBytes) {
      res.status(413).json(validate.apiError("state_value_too_large", "State value is too large.", 413));
      return;
    }
  }

  const state = await readState();
  const next = { version: 1, items: { ...(state.items || {}) } };
  const serverTimestamp = Date.now();
  entries.forEach(([key, value], index) => {
    next.items[key] = {
      value: String(value ?? ""),
      updatedAt: serverTimestamp + index,
    };
  });
  const saved = await writeState(next);
  res.status(200).json({ ok: true, savedAt: saved.savedAt });
};

const handleUpload = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json(validate.apiError("method_not_allowed", "Method not allowed", 405));
    return;
  }
  if (!requireAdminRequest(req, res, { sameOrigin: true })) return;
  const uploadLimit = await uploadLimiter(clientIp(req));
  if (!uploadLimit.allowed) {
    rateLimited(res, uploadLimit.retryAfterSeconds);
    return;
  }
  if (!isMediaConfigured()) {
    res.status(503).json(validate.apiError("blob_not_configured", "上传服务尚未配置。", 503));
    return;
  }

  const url = new URL(req.url, "https://yitenhuang.com");
  const fileName = String(url.searchParams.get("fileName") || "").slice(0, 180);
  const folder = String(url.searchParams.get("folder") || "");
  const contentType = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  const allowedExtensions = allowedUploadTypes.get(contentType);
  const contentLength = Number(req.headers["content-length"] || 0);
  if (!allowedUploadFolders.has(folder)) {
    res.status(403).json(validate.apiError("upload_folder_forbidden", "Upload folder is not allowed.", 403));
    return;
  }
  if (!fileName || !allowedExtensions?.has(extensionFromName(fileName))) {
    res.status(415).json(validate.apiError("file_type_not_allowed", "File type is not allowed.", 415));
    return;
  }
  if (Number.isFinite(contentLength) && contentLength > maxUploadBytes) {
    res.status(413).json(validate.apiError("upload_too_large", "文件超过当前上传限制。", 413));
    return;
  }

  const body = await readRawBody(req);
  if (!body.length) {
    res.status(400).json(validate.apiError("empty_upload", "没有收到文件内容。", 400));
    return;
  }
  const blob = await putBlob({
    pathname: pathnameForUpload({ folder, fileName }),
    body,
    contentType,
    access: "public",
  });
  res.status(200).json({
    ok: true,
    url: blob.url,
    pathname: blob.pathname,
    contentType,
    size: body.length,
  });
};

const safeJsonParse = (value, fallback) => {
  try {
    const parsed = JSON.parse(value || "");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch (_error) {
    return fallback;
  }
};

const normalizeViewKey = (value) => {
  const normalized = String(value || "")
    .trim()
    .replace(/[^\w:.-]+/g, "-")
    .slice(0, 160);
  return ["__proto__", "prototype", "constructor"].includes(normalized) ? "" : normalized;
};

const handleView = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json(validate.apiError("method_not_allowed", "Method not allowed", 405));
    return;
  }
  const viewLimit = await viewLimiter(clientIp(req));
  if (!viewLimit.allowed) {
    rateLimited(res, viewLimit.retryAfterSeconds);
    return;
  }
  if (process.env.PUBLIC_VIEW_TRACKING_ENABLED !== "true") {
    res.status(503).json(validate.apiError("view_tracking_disabled", "浏览统计暂未启用。", 503));
    return;
  }
  if (!isSameOriginRequest(req)) {
    res.status(403).json(validate.apiError("origin_forbidden", "请求来源无效。", 403));
    return;
  }
  const body = await readJsonBody(req, 8 * 1024);
  const workKey = normalizeViewKey(body.workKey || body.id || body.key);
  if (!workKey) {
    res.status(400).json(validate.apiError("missing_work_key", "Missing work key.", 400));
    return;
  }

  const state = await readState();
  const publishedWorks = projectPublicCatalog(state).works;
  const publishedIds = new Set(
    publishedWorks
      .map((work) => normalizeViewKey(work.key || work.workKey || work.id || work.sourceId))
      .filter(Boolean)
  );
  if (!publishedIds.has(workKey)) {
    res.status(404).json(validate.apiError("unknown_work", "Unknown published work.", 404));
    return;
  }

  const viewsKey = "yiten-work-views";
  const views = safeJsonParse(state.items?.[viewsKey]?.value, Object.create(null));
  const current = views[workKey] && typeof views[workKey] === "object" ? views[workKey] : {};
  const now = new Date().toISOString();
  views[workKey] = {
    count: Math.max(0, Number(current.count || 0)) + 1,
    lastViewedAt: now,
  };
  await writeState({
    ...state,
    items: {
      ...(state.items || {}),
      [viewsKey]: { value: JSON.stringify(views), updatedAt: Date.now() },
    },
  });
  res.status(200).json({ ok: true, workKey, count: views[workKey].count, lastViewedAt: now });
};

module.exports = async function handler(req, res) {
  setNoStore(res);
  res.setHeader("X-Content-Type-Options", "nosniff");
  try {
    const url = new URL(req.url, "https://yitenhuang.com");
    const target = url.searchParams.get("target") || url.pathname.split("/").filter(Boolean).pop();
    if (target === "state") return await handleState(req, res);
    if (target === "upload") return await handleUpload(req, res);
    if (target === "view") return await handleView(req, res);
    res.status(404).json(validate.apiError("unknown_endpoint", "Unknown sync endpoint.", 404));
  } catch (error) {
    const status = Number(error.status) || 500;
    res.status(status).json({
      ok: false,
      message: status < 500 ? error.message : "同步服务暂时不可用。",
    });
  }
};
