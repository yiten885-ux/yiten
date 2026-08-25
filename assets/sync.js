(function () {
  const script = document.currentScript;
  const requestedScope = script?.dataset?.syncScope || "public";
  const scope = ["public", "admin", "disabled"].includes(requestedScope) ? requestedScope : "disabled";
  const publicKeys = new Set([
    "personal-site-works",
    "personal-site-works-updated-at",
    "yiten-book-products",
    "yiten-book-products-updated-at",
    "yiten-contact-config",
    "yiten-work-views",
  ]);
  const legacyPublicContentKeys = ["yiten-published-works", "yiten-creator-published-works"];
  const privateKeys = new Set([
    ...publicKeys,
    "yiten-creator-accounts",
    "yiten-creator-review-queue",
    "yiten-creator-content-review-queue",
    "yiten-creator-invites",
    "yiten-review-updated-at",
    "personal-site-subscribers",
    "yiten-share-rewards-v1",
    "yiten-offer",
    "yiten-admin-draft",
  ]);
  const privatePrefixes = ["yiten-creator-work:", "yiten-creator-books:", "yiten-creator-offers:"];
  const sensitiveSessionKeys = [
    "yiten-creator-session",
    "yiten-creator-phone-code",
    "yiten-creator-reset-code",
  ];
  const isTracked = (key) => {
    const normalized = String(key || "");
    if (scope === "public") return publicKeys.has(normalized);
    if (scope !== "admin") return false;
    return privateKeys.has(normalized) || privatePrefixes.some((prefix) => normalized.startsWith(prefix));
  };

  const nativeSetItem = localStorage.setItem.bind(localStorage);
  const nativeRemoveItem = localStorage.removeItem.bind(localStorage);
  const nativeGetItem = localStorage.getItem.bind(localStorage);
  const localUpdatedAtKey = "__yiten-sync-updated-at";
  const pendingKeys = new Set();
  let applyingRemote = false;
  let pushTimer = 0;
  let lastSavedAt = "";
  let started = false;
  let lifecycleInstalled = false;
  let pullIntervalId = 0;

  const readUpdatedAt = () => {
    try {
      return JSON.parse(nativeGetItem(localUpdatedAtKey) || "{}") || {};
    } catch (_error) {
      return {};
    }
  };
  const writeUpdatedAt = (state) => nativeSetItem(localUpdatedAtKey, JSON.stringify(state));
  const dispatchSyncEvent = (keys) => {
    if (keys.length) window.dispatchEvent(new CustomEvent("yiten-sync-updated", { detail: { keys } }));
  };

  const markUpdated = (key, stamp = Date.now()) => {
    const state = readUpdatedAt();
    state[key] = stamp;
    writeUpdatedAt(state);
    return stamp;
  };

  const schedulePush = (key) => {
    if (scope !== "admin" || !started || !isTracked(key) || applyingRemote) return;
    markUpdated(key);
    pendingKeys.add(key);
    window.clearTimeout(pushTimer);
    pushTimer = window.setTimeout(pushPending, 350);
  };

  const pushPending = async () => {
    if (scope !== "admin" || !started) return { ok: false, code: "admin_sync_not_started" };
    const keys = Array.from(pendingKeys);
    pendingKeys.clear();
    if (!keys.length) return { ok: true, unchanged: true };
    const items = {};
    keys.forEach((key) => {
      if (isTracked(key)) items[key] = nativeGetItem(key) || "";
    });
    try {
      const response = await fetch("./api/sync/state", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        stop({ clearPrivate: true });
        return { ok: false, code: result.code || "authentication_required" };
      }
      if (!response.ok || !result.ok) throw new Error(result.message || "Private sync push failed");
      if (result.savedAt) lastSavedAt = result.savedAt;
      return result;
    } catch (error) {
      keys.forEach((key) => pendingKeys.add(key));
      console.warn("Yiten admin sync push failed", error);
      return { ok: false, message: error.message };
    }
  };

  const applyPublicCatalog = (data) => {
    const nextValues = {
      "personal-site-works": JSON.stringify(Array.isArray(data.works) ? data.works : []),
      "personal-site-works-updated-at": String(data.savedAt || ""),
      "yiten-book-products": JSON.stringify(data.products && typeof data.products === "object" ? data.products : {}),
      "yiten-book-products-updated-at": String(data.savedAt || ""),
      "yiten-contact-config": JSON.stringify(data.contact && typeof data.contact === "object" ? data.contact : {}),
      "yiten-work-views": JSON.stringify(data.viewCounts && typeof data.viewCounts === "object" ? data.viewCounts : {}),
    };
    const changedKeys = [];
    applyingRemote = true;
    Object.entries(nextValues).forEach(([key, value]) => {
      if (nativeGetItem(key) === value) return;
      nativeSetItem(key, value);
      changedKeys.push(key);
    });
    legacyPublicContentKeys.forEach((key) => {
      if (nativeGetItem(key) === null) return;
      nativeRemoveItem(key);
      changedKeys.push(key);
    });
    applyingRemote = false;
    if (data.savedAt) lastSavedAt = data.savedAt;
    dispatchSyncEvent(changedKeys);
    return changedKeys;
  };

  const applyPrivateState = (data) => {
    const localStamps = readUpdatedAt();
    const changedKeys = [];
    applyingRemote = true;
    Object.entries(data.items || {}).forEach(([key, value]) => {
      if (!isTracked(key)) return;
      const remoteUpdatedAt = Number(data.updatedAt?.[key] || 0);
      if ((nativeGetItem(key) || "") !== String(value || "")) {
        nativeSetItem(key, String(value || ""));
        changedKeys.push(key);
      }
      localStamps[key] = remoteUpdatedAt;
    });
    writeUpdatedAt(localStamps);
    applyingRemote = false;
    if (data.savedAt) lastSavedAt = data.savedAt;
    dispatchSyncEvent(changedKeys);
    return changedKeys;
  };

  const pull = async () => {
    if (scope === "disabled") return { ok: false, code: "sync_disabled" };
    if (scope === "admin" && !started) return { ok: false, code: "admin_sync_not_started" };
    try {
      if (scope === "admin") {
        const endpoint = `./api/sync/state?t=${Date.now()}${lastSavedAt ? `&since=${encodeURIComponent(lastSavedAt)}` : ""}`;
        const response = await fetch(endpoint, {
          cache: "no-store",
          credentials: "include",
        });
        const data = await response.json().catch(() => ({}));
        const errorCode = (data && data.error && data.error.code) || (data && data.code) || "";
        if (response.status === 401) {
          stop({ clearPrivate: true });
          return { ok: false, code: errorCode || "authentication_required" };
        }
        if (!response.ok || !data.ok) return { ok: false, code: errorCode || "sync_failed" };
        if (data.unchanged) {
          if (data.savedAt) lastSavedAt = data.savedAt;
          return data;
        }
        applyPrivateState(data);
        return data;
      }

      // public:优先走统一 catalog 客户端(校验层);无客户端时回退原逻辑。
      const catalogClient = typeof window !== "undefined" && window.YitenCatalog ? window.YitenCatalog : null;
      if (catalogClient) {
        const catalog = await catalogClient.fetchCatalog();
        applyPublicCatalog(catalog);
        return catalog;
      }
      const response = await fetch(`./api/public/catalog?t=${Date.now()}`, {
        cache: "no-store",
        credentials: "omit",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) return { ok: false, code: data.code || "sync_failed" };
      applyPublicCatalog(data);
      return data;
    } catch (error) {
      console.warn(`Yiten ${scope} sync pull failed`, error);
      return { ok: false, message: error.message };
    }
  };

  const uploadFile = async (file, folder = "uploads") => {
    if (scope !== "admin" || !started) {
      const error = new Error("上传需要有效的后台会话。");
      error.code = "authentication_required";
      throw error;
    }
    if (!file) return null;
    const search = new URLSearchParams({ folder, fileName: file.name || "upload.bin" });
    const response = await fetch(`./api/sync/upload?${search.toString()}`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) stop({ clearPrivate: true });
    if (!response.ok || !result.ok) {
      const error = new Error(result.message || "文件上传失败");
      error.code = result.code;
      throw error;
    }
    return result;
  };

  const handleFocus = () => pull();
  const handlePageShow = () => pull();
  const handleVisibilityChange = () => {
    if (!document.hidden) pull();
  };

  const installLifecycle = () => {
    if (lifecycleInstalled) return;
    lifecycleInstalled = true;
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    pullIntervalId = window.setInterval(pull, 30000);
  };

  const uninstallLifecycle = () => {
    if (!lifecycleInstalled) return;
    lifecycleInstalled = false;
    window.removeEventListener("focus", handleFocus);
    window.removeEventListener("pageshow", handlePageShow);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    if (pullIntervalId) window.clearInterval(pullIntervalId);
    pullIntervalId = 0;
  };

  const clearPrivateState = () => {
    if (scope !== "admin") return [];
    const removed = [];
    applyingRemote = true;
    try {
      try {
        for (let index = localStorage.length - 1; index >= 0; index -= 1) {
          const key = localStorage.key(index);
          const isLegacyPrivate = String(key || "").startsWith("yiten-creator-") || key === "yiten-published-works";
          if (!isTracked(key) && !isLegacyPrivate) continue;
          nativeRemoveItem(key);
          removed.push(key);
        }
        nativeRemoveItem(localUpdatedAtKey);
      } catch (_error) {
        // A blocked storage API must not prevent the UI from locking.
      }
      try {
        sensitiveSessionKeys.forEach((key) => sessionStorage.removeItem(key));
      } catch (_error) {
        // A blocked storage API must not prevent the UI from locking.
      }
    } finally {
      applyingRemote = false;
    }
    lastSavedAt = "";
    dispatchSyncEvent(removed);
    return removed;
  };

  const stop = ({ clearPrivate = false } = {}) => {
    started = false;
    window.clearTimeout(pushTimer);
    pushTimer = 0;
    pendingKeys.clear();
    uninstallLifecycle();
    return clearPrivate ? clearPrivateState() : [];
  };

  const start = async () => {
    if (scope === "disabled") return { ok: false, code: "sync_disabled" };
    started = true;
    installLifecycle();
    return pull();
  };

  if (scope === "admin") {
    localStorage.setItem = function (key, value) {
      nativeSetItem(key, value);
      schedulePush(key);
    };
    localStorage.removeItem = function (key) {
      nativeRemoveItem(key);
      schedulePush(key);
    };
  }

  window.YitenSync = {
    isTracked,
    mode: scope,
    clearPrivateState,
    pull,
    pushPending,
    start,
    stop,
    uploadFile,
  };

  if (scope === "public") start();
})();
