// assets/catalog.js — 公共目录客户端(零依赖,UMD)
// 依赖 window.YitenValidate / require("./validate.js")。
// 统一请求封装:校验响应结构、错误映射为 ApiError、超时守卫。
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./validate.js"));
  } else {
    root.YitenCatalog = factory(root.YitenValidate);
  }
})(typeof self !== "undefined" ? self : this, function (V) {
  "use strict";

  const DEFAULT_TIMEOUT_MS = 15000;

  // 客户端异常:Error 实例 + 顶层 code/status,便于 catch 分支判断。
  const toError = (code, message, status) => {
    const error = new Error(message);
    error.code = code;
    error.status = Number(status) || 500;
    error.ok = false;
    return error;
  };

  // 拉取并校验公共目录。失败抛 { code, message, status }。
  const fetchCatalog = async ({ signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) => {
    let timeoutId = null;
    const controller = new AbortController();
    const onOuterAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", onOuterAbort);
    }
    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }

    let response;
    try {
      response = await fetch(`./api/public/catalog?t=${Date.now()}`, {
        credentials: "omit",
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
    } catch (error) {
      throw toError(error && error.name === "AbortError" ? "timeout" : "network_error", "目录加载超时或网络异常,请稍后重试。", 0);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (signal) signal.removeEventListener("abort", onOuterAbort);
    }

    let data = null;
    try {
      data = await response.json();
    } catch (_error) {
      throw toError("bad_response", "服务响应异常。", 502);
    }

    if (!response.ok || !data || data.ok !== true) {
      const error = (data && data.error) || {};
      throw toError(error.code || (data && data.code) || "catalog_unavailable", error.message || "公开内容暂时不可用。", response.status || 503);
    }

    const normalized = V.catalogResponse(data);
    if (!normalized) {
      throw toError("bad_catalog_shape", "目录数据结构异常。", 502);
    }
    return normalized;
  };

  return { fetchCatalog };
});
