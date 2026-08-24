// assets/validate.js — 轻量校验层(零依赖,UMD)
// 前端: <script src="./assets/validate.js" defer></script> → window.YitenValidate
// 后端: require("../../assets/validate.js") → module.exports
// 这是 index 页 + catalog 链路的样板;后续端点按同一模式接入。
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.YitenValidate = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const isArray = Array.isArray;
  const isString = (value) => typeof value === "string";
  const isBoolean = (value) => typeof value === "boolean";

  // 收窄为字符串,超长截断;非字符串转空串(不抛错,保证契约安全)。
  const safeString = (value, max = 200) => {
    if (value === null || value === undefined) return "";
    const text = String(value);
    return text.length > max ? text.slice(0, max) : text;
  };

  const WORK_KEYS = [
    "id", "sourceId", "key", "title", "type", "author", "summary", "date",
    "publishedAt", "link", "cover", "access", "freePreviewPercent", "tags",
  ];

  // 规范化单个作品:仅保留已知字段,字符串截断,未知字段丢弃。
  const normalizeWork = (work) => {
    if (!isObject(work)) return null;
    const normalized = {};
    for (const key of WORK_KEYS) {
      if (!(key in work)) continue;
      const value = work[key];
      if (isArray(value)) {
        normalized[key] = value.map((item) => safeString(item, 80)).filter(Boolean);
      } else if (isString(value) || typeof value === "number") {
        normalized[key] = key === "summary" ? safeString(value, 500) : safeString(value, 200);
      } else if (isBoolean(value)) {
        normalized[key] = value;
      }
    }
    return normalized;
  };

  // 契约校验公开目录响应(服务端已净化内容,这里守护结构/类型,原样返回)。
  // 返回原 data(契约通过)或 null(结构非法)。
  const catalogResponse = (data) => {
    if (!isObject(data) || data.ok !== true) return null;
    if (!isArray(data.works) || data.works.some((work) => !isObject(work))) return null;
    if (!isObject(data.products)) return null;
    if (!isObject(data.viewCounts)) return null;
    if (!(data.savedAt === null || isString(data.savedAt))) return null;
    return data;
  };

  // 统一业务错误结构:{ ok:false, error:{ code, message } }
  const apiError = (code, message, status) => ({
    ok: false,
    error: { code: safeString(code, 60) || "error", message: safeString(message, 300) },
    status: Number(status) || 500,
  });

  return {
    apiError,
    catalogResponse,
    isArray,
    isBoolean,
    isObject,
    isString,
    normalizeWork,
    safeString,
  };
});
