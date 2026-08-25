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

  // ---------- 作品卡片 ----------

  // input: { work, title, summary, typeLabel, accessLabel, originalLabel,
  //          copyrightLabel, publishedAt, previewText, inlineBody, fallbackBody,
  //          audioSource, isAudioWork, missingAudioHint, unlockCopy, shareState,
  //          rewardUnlocked, locked, index, workKey, url, coverUrl,
  //          shareLabels, uiLabels }
  // 纯函数:文案与格式化由调用方(app.js)计算,本组件只做安全装配。
  const workCard = (input) => {
    const {
      work, title, summary, typeLabel, accessLabel, originalLabel, copyrightLabel,
      publishedAt, previewText, inlineBody, fallbackBody, audioSource, isAudioWork,
      missingAudioHint, unlockCopy, shareState, rewardUnlocked, locked, index, workKey,
      url, coverUrl, shareLabels = {}, uiLabels = {},
    } = input;
    const attr = escapeAttribute;
    const progressStyle = `style="--free-percent: ${Number(work.freePercent) || 35}%"`;

    // 纵深防御:URL 一律再过安全过滤(即使调用方已净化)
    const safeCover = safePublicClientUrl(coverUrl);
    const coverBlock = safeCover
      ? `<div class="work-cover"><img src="${attr(safeCover)}" alt="${attr(title)}" loading="lazy" /></div>`
      : `<div class="work-cover work-cover-text" aria-hidden="true"><span class="work-cover-type">${escapeHtml(typeLabel)}</span><span class="work-cover-title">${escapeHtml(title)}</span></div>`;

    const timeBlock = publishedAt
      ? `<time class="work-time" datetime="${attr(work.publishedAt || work.updatedAt || work.createdAt)}">${escapeHtml(publishedAt)}</time>`
      : "";

    const metaRow = `
            <div class="work-meta-row">
              <span class="work-type">${escapeHtml(typeLabel)}</span>
              ${work.original === false ? "" : `<span class="original-pill">${escapeHtml(originalLabel)}</span>`}
              ${work.copyrightHash ? `<span class="copyright-pill" title="${attr(work.copyrightHash)}">${escapeHtml(copyrightLabel)}</span>` : ""}
              <span class="access-pill">${escapeHtml(accessLabel)}</span>
            </div>`;

    const bodyBlock = inlineBody || fallbackBody
      ? `<details class="published-body work-body-details" id="${attr(work.id || workKey)}"><summary>${rewardUnlocked || work.access === "free" ? "展开完整内容" : "展开免费试看"}</summary><div class="published-body-content">${inlineBody || fallbackBody}</div></details>`
      : "";

    const safeAudio = safePublicClientUrl(audioSource, { allowHash: false });
    const audioBlock = safeAudio
      ? `<div class="audio-player-shell"><span class="audio-play-label">播放音频</span><audio class="work-audio-player" controls preload="metadata" src="${attr(safeAudio)}"></audio></div>`
      : isAudioWork
        ? `<div class="audio-player-shell audio-missing"><strong>暂无可播放音频</strong><small>${escapeHtml(missingAudioHint)}</small></div>`
        : "";

    const attachmentsBlock = (() => {
      const list = Array.isArray(work.attachments) ? work.attachments : [];
      if (!list.length) return "";
      return `<div class="work-attachments"><span>含 ${list.length} 个配套附件</span></div>`;
    })();

    const hasExpandableContent = Boolean(bodyBlock);
    const workUrl = hasExpandableContent ? `#${attr(work.id || workKey)}` : attr(safePublicClientUrl(url) || "#works");
    const linkTarget = hasExpandableContent ? "" : ` target="_blank" rel="noreferrer"`;

    const shareButtons = Object.keys(shareLabels).length
      ? Object.entries(shareLabels).map(([platform, label]) => `<button type="button" data-share="${attr(platform)}">${escapeHtml(label)}</button>`).join("")
      : "";

    return `
        <article class="work-card${isAudioWork ? " audio-work-card" : ""}${locked && !rewardUnlocked ? " gated" : ""}${rewardUnlocked ? " reward-unlocked" : ""}" data-index="${index}" data-work-key="${attr(workKey)}">
          ${coverBlock}
          ${timeBlock}
          <div>
            ${metaRow}
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(summary)}</p>
            ${audioBlock}
            <div class="preview-meter" ${progressStyle}><span></span></div>
            <small class="preview-copy">${escapeHtml(previewText)}</small>
            ${bodyBlock}
            ${attachmentsBlock}
          </div>
          <div class="work-actions">
            <a class="work-link" href="${workUrl}"${linkTarget}>${locked && !rewardUnlocked ? escapeHtml(uiLabels.readPreview || "") : escapeHtml(uiLabels.readFull || "")}</a>
            ${locked && !rewardUnlocked ? `<button class="work-link reward-unlock-button" type="button" data-unlock-work ${shareState && shareState.availableUnlocks < 1 ? "disabled" : ""}>${escapeHtml(unlockCopy)}</button><a class="work-link subscribe-link" href="#membership">${escapeHtml(uiLabels.subscribeUnlock || "")}</a>` : ""}
            ${shareButtons ? `<div class="share-actions" aria-label="${escapeHtml(uiLabels.shareAria || "")} ${attr(title)}">${shareButtons}</div>` : ""}
            <div class="share-composer" data-share-composer hidden>
              <label>${escapeHtml(uiLabels.shareTextLabel || "")}
                <textarea data-share-draft rows="7"></textarea>
              </label>
              <small>${escapeHtml(uiLabels.shareHint || "")}</small>
            </div>
          </div>
        </article>
      `;
  };

  // ---------- 书籍产品数据映射 ----------

  const coverSrc = (cover) => safePublicClientUrl(
    typeof cover === "string" ? cover : cover && (cover.url || cover.src || cover.preview || cover.href) || "",
    { allowHash: false }
  );

  const splitList = (value) => String(value || "").split(/[\n,，、/]+/).map((item) => item.trim()).filter(Boolean);

  // 产品对象 → 卡片展示数据(纯函数,不含 HTML;DOM 绑定由调用方完成)
  const bookProductData = (product) => {
    if (!product || typeof product !== "object") return null;
    const files = Array.isArray(product.files)
      ? product.files.map((file) => (file && file.name) || "").filter(Boolean)
      : [];
    const fileExts = Array.from(new Set(files.map((name) => (name.split(".").pop() || "").toUpperCase()).filter(Boolean)));
    const highlights = splitList(product.includes);
    const fallback = files.length
      ? Array.from(new Set(files.map((name) => `${(name.split(".").pop() || "").toUpperCase() || "文件"} 格式已配置`)))
      : [];
    return {
      title: String(product.title || ""),
      description: String(product.description || ""),
      points: (highlights.length ? highlights : fallback).slice(0, 5),
      visitorPrice: Number.isFinite(Number(product.visitorPrice)) ? Number(product.visitorPrice) : null,
      memberPrice: Number.isFinite(Number(product.memberPrice)) ? Number(product.memberPrice) : null,
      cover: coverSrc(product.cover || product.coverUrl),
      files,
      formats: (splitList(product.formats).length ? splitList(product.formats) : fileExts).slice(0, 8),
    };
  };

  const formatPrice = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return `$${String(value)}`;
    return `$${numeric.toFixed(numeric % 1 ? 2 : 0)}`;
  };

  return {
    bookProductData,
    coverSrc,
    escapeAttribute,
    escapeHtml,
    formatPrice,
    safePublicClientUrl,
    shareRewardPanel,
    splitList,
    workCard,
  };
});
