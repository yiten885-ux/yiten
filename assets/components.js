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

  // ---------- 诊断工具数据(纯数据,无副作用) ----------

  const diagnosticTools = {
    cashflow: {
      step: "Step 01",
      progress: "33%",
      title: "家庭财务体检表",
      checkupTitle: "最新作品：免费家庭财务体检",
      copy: "填写收入、必要支出、债务、现金和保障数据，系统会先帮你看见家庭财务结构里最脆弱的地方。",
      checkupDescription: "填写几个基础数据，系统会给出一个简版风险等级。这个测评不能替代专业财务建议，但能帮助你快速发现家庭财务结构里的薄弱环节。",
      questions: ["月度净现金流是否为正", "债务还款是否压缩生活", "应急金能否支撑 6 个月"],
      signal: "即时反馈：完成数据后会生成风险等级和三条修复建议。",
      feedback: "当前入口：家庭财务体检表。点击“进入诊断”后从第一组问题开始。",
    },
    windfall: {
      step: "Step 02",
      progress: "66%",
      title: "50万财富守恒测评",
      checkupTitle: "最新作品：50万财富守恒测评",
      copy: "同样一组家庭数据，会切换到“第一笔大钱”场景：收入突然增加、奖金到账或卖出资产后，哪些结构最容易让钱重新流走。",
      checkupDescription: "用现金流、债务、人情支出和消费行为判断：拿到第一笔大钱后，你是否存在 18-36 个月返贫风险。",
      questions: ["收入上涨后消费是否同步上涨", "资产负债率是否放大波动", "亲友借钱是否侵蚀安全垫"],
      signal: "即时反馈：系统会把结果解释成守财能力，而不只是财务分数。",
      feedback: "已切换到 50 万财富守恒视角。先用同一组家庭数据检查返贫风险。",
    },
    map: {
      step: "Step 03",
      progress: "100%",
      title: "家庭防坠落风险地图",
      checkupTitle: "最新作品：家庭防坠落风险地图",
      copy: "把家庭风险从钱扩展到人：老人、孩子、健康、婚姻、关系、人情和黑天鹅事件，都会影响财富是否能守住。",
      checkupDescription: "这个视角会把测评结果解释成家庭防线地图，帮助你定位最先要修补的现金流、保障、关系和黑天鹅风险。",
      questions: ["家庭是否依赖单一收入", "医保和现金储备是否明确", "关系支出是否有边界"],
      signal: "即时反馈：完成后会优先给出三条最该修补的防线。",
      feedback: "已切换到家庭防坠落风险地图。测评结果会帮你定位最先要修补的防线。",
    },
  };

  // ---------- 订阅表单逻辑(纯逻辑,可测试) ----------

  // 校验邮箱 + 去重写入 storage;storage 缺失时仅校验。
  const subscribeEmail = (email, { storage = null, storageKey = "personal-site-subscribers" } = {}) => {
    const value = String(email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      return { ok: false, message: "邮箱格式不正确。" };
    }
    let subscribed = false;
    if (storage) {
      let list = [];
      try {
        list = JSON.parse(storage.getItem(storageKey) || "[]");
      } catch (_error) {
        list = [];
      }
      if (!Array.isArray(list)) list = [];
      if (!list.includes(value)) {
        list.push(value);
        subscribed = true;
        try {
          storage.setItem(storageKey, JSON.stringify(list));
        } catch (_error) {
          // 配额/隐私模式:跳过持久化
        }
      }
    }
    return { ok: true, subscribed, message: "已订阅。后续更新会发送到你的邮箱。" };
  };

  // ---------- 札记发布历史时间线(纯函数) ----------

  // works 中 type=note 且已发布的条目,按发布时间倒序输出时间线 HTML。
  const noteTimeline = (works, { lang = "zh" } = {}) => {
    const notes = (Array.isArray(works) ? works : [])
      .filter((work) => work && (work.type === "note" || work.type === "札记"))
      .map((work) => ({ work, ts: Date.parse(work.publishedAt || work.createdAt || "") }))
      .filter((item) => Number.isFinite(item.ts))
      .sort((a, b) => b.ts - a.ts);
    if (!notes.length) return "";
    return `<ul class="note-timeline">${notes
      .map(({ work, ts }) => {
        const date = new Date(ts);
        const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        const anchor = work.id || work.sourceId || work.key || "works";
        return `<li><time datetime="${escapeAttribute(work.publishedAt || work.createdAt || "")}">${escapeHtml(label)}</time><a href="#${escapeAttribute(anchor)}">${escapeHtml(work.title || "未命名札记")}</a></li>`;
      })
      .join("")}</ul>`;
  };

  return {
    bookProductData,
    coverSrc,
    diagnosticTools,
    escapeAttribute,
    escapeHtml,
    formatPrice,
    safePublicClientUrl,
    shareRewardPanel,
    noteTimeline,
    splitList,
    subscribeEmail,
    workCard,
  };
});
