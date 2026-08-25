// assets/components.js — 组件化渲染层(零依赖,UMD)
// 纯函数生成 HTML 字符串(无 DOM 副作用),由 app.js 负责 DOM 装配与事件。
// 前端: <script src="./assets/components.js" defer></script> → window.YitenComponents
// 测试: require("./components.js")
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.YitenComponents = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---------- 安全工具 ----------

  const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      };
      return entities[character];
    });

  const escapeAttribute = (value) => escapeHtml(value).replace(/`/g, "&#096;");

  // 仅允许 http/https 或站内锚点;阻止 javascript: 等危险协议。
  const safePublicClientUrl = (value, { allowHash = true, origin = "" } = {}) => {
    const candidate = String(value || "").trim();
    if (!candidate) return "";
    if (allowHash && candidate.startsWith("#")) return candidate;
    if (candidate.includes("\\") || candidate.startsWith("//")) return "";
    try {
      const base = origin || (typeof location !== "undefined" && location.origin) || "https://yitenhuang.com";
      const url = new URL(candidate, base);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch (_error) {
      return "";
    }
  };

  // ---------- 分享奖励面板 ----------

  // state: { completedShares, availableUnlocks, unlockedWorks, history, lastAutoUnlocked, updatedAt }
  // copy: 现成文案对象(chooseText 的产物);threshold: 解锁所需分享次数
  const shareRewardPanel = ({ state, copy, threshold }) => {
    const nextCopy = state.lastAutoUnlocked
      ? `${copy.unlockedPrefix}${state.lastAutoUnlocked.title}`
      : state.availableUnlocks > 0
        ? copy.nowUnlockable
        : copy.waiting;
    return `
    <div>
      <strong>${escapeHtml(copy.title)}</strong>
      <span>${escapeHtml(copy.rulePrefix)} ${Number(threshold) || 3} ${escapeHtml(copy.ruleSuffix)}</span>
    </div>
    <div class="share-reward-stats" aria-live="polite">
      <span>${escapeHtml(copy.sharedCount)} ${Number(state.completedShares) || 0} ${escapeHtml(copy.times)}</span>
      <span>${escapeHtml(copy.availableUnlocks)} ${Number(state.availableUnlocks) || 0} ${escapeHtml(copy.times)}</span>
      <span>${escapeHtml(nextCopy)}</span>
    </div>
  `;
  };

  return {
    escapeAttribute,
    escapeHtml,
    safePublicClientUrl,
    shareRewardPanel,
  };
});
