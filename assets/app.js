const defaultWorks = [
  {
    title: "为什么个人网站仍然重要",
    type: "essay",
    summary:
      "当平台不断变化，个人网站是你的思想、作品和关系的长期资产。它不是简历，而是一块可以持续复利的土地。",
    url: "https://example.com/essay",
    access: "metered",
    freePercent: 35,
  },
  {
    title: "从零搭建个人内容资产库",
    type: "project",
    summary:
      "把文章、音频、电子书和研究札记整理成可检索、可复用、可持续更新的长期资料库。",
    url: "https://example.com/project",
    access: "metered",
    freePercent: 40,
  },
  {
    title: "关于注意力的十二条札记",
    type: "note",
    summary:
      "一些短句和观察：如何减少信息噪音，如何把灵感收集成主题，如何让阅读真正改变行动。",
    url: "https://example.com/note",
    access: "member",
    freePercent: 20,
  },
];

const labels = {
  essay: { zh: "文章", en: "Essays" },
  project: { zh: "项目", en: "Projects" },
  note: { zh: "札记", en: "Notes" },
  audio: { zh: "音频", en: "Audio" },
};

const accessLabels = {
  free: { zh: "免费公开", en: "Free" },
  metered: { zh: "部分免费", en: "Partial Preview" },
  member: { zh: "订阅解锁", en: "Member Only" },
};

const uiText = {
  fallbackWork: { zh: "作品", en: "Work" },
  rewardUnlocked: { zh: "分享奖励已解锁", en: "Unlocked by Sharing" },
  freePreview: { zh: "游客可阅读全文 / 收听完整节目", en: "Visitors can read or listen in full" },
  unlockedFull: { zh: "你已通过分享奖励解锁完整内容", en: "Unlocked with your share reward" },
  trialPrefix: { zh: "游客可免费试看", en: "Visitors can preview" },
  trialSuffix: { zh: "剩余内容订阅后解锁", en: "Subscribe to unlock the rest" },
  readPreview: { zh: "免费试看", en: "Preview" },
  readFull: { zh: "阅读完整内容", en: "Read Full" },
  subscribeUnlock: { zh: "订阅解锁", en: "Subscribe to Unlock" },
  useReward: { zh: "使用分享奖励解锁", en: "Use Share Reward" },
  moreSharesPrefix: { zh: "再分享", en: "Share" },
  moreSharesSuffix: { zh: "次可解锁", en: "more to unlock" },
  shareLabel: { zh: "分享", en: "Share" },
  shareTextLabel: { zh: "分享文案", en: "Share Copy" },
  shareHint: { zh: "已自动生成文案，可直接分享，也可以删除后写自己的感受。", en: "Copy is generated automatically. Edit it before sharing if you want." },
  shareReward: { zh: "分享解锁", en: "Share to Unlock" },
  shareRewardRulePrefix: { zh: "每分享", en: "Every" },
  shareRewardRuleSuffix: { zh: "篇作品，可解锁 1 篇完整内容。", en: "shares unlock 1 full piece." },
  sharedCount: { zh: "已分享", en: "Shared" },
  availableUnlocks: { zh: "可用解锁", en: "Unlocks" },
  nowUnlockable: { zh: "现在可解锁", en: "Ready to unlock" },
  times: { zh: "次", en: "" },
  shareAria: { zh: "分发", en: "Share" },
};

const platformButtonLabels = {
  wechat: { zh: "微信", en: "WeChat" },
  substack: { zh: "Substack", en: "Substack" },
  youtube: { zh: "YouTube", en: "YouTube" },
  xiaohongshu: { zh: "小红书", en: "Xiaohongshu" },
  tiktok: { zh: "TikTok", en: "TikTok" },
  x: { zh: "X", en: "X" },
  reddit: { zh: "Reddit", en: "Reddit" },
  facebook: { zh: "Facebook", en: "Facebook" },
  linkedin: { zh: "LinkedIn", en: "LinkedIn" },
  weibo: { zh: "微博", en: "Weibo" },
};

const getLang = () => window.YitenI18n?.getLanguage?.() || document.body.dataset.lang || "zh";
const chooseText = (value) => {
  if (!value || typeof value !== "object") return value || "";
  return value[getLang() === "en" ? "en" : "zh"] || value.zh || "";
};
const translateText = (value) => {
  const text = String(value || "");
  return getLang() === "en" ? window.YitenI18n?.t?.(text) || text : text;
};
const formatPreviewText = (work, rewardUnlocked) => {
  if (work.access === "free") return chooseText(uiText.freePreview);
  if (rewardUnlocked) return chooseText(uiText.unlockedFull);
  if (getLang() === "en") return `${chooseText(uiText.trialPrefix)} ${work.freePercent}%. ${chooseText(uiText.trialSuffix)}.`;
  return `${chooseText(uiText.trialPrefix)} ${work.freePercent}%，${chooseText(uiText.trialSuffix)}`;
};
const getSharesUntilNextUnlock = (state = readShareRewards()) => {
  if (state.availableUnlocks > 0) return 0;
  const remainder = Number(state.completedShares || 0) % SHARE_REWARD_THRESHOLD;
  return remainder === 0 ? SHARE_REWARD_THRESHOLD : SHARE_REWARD_THRESHOLD - remainder;
};

const formatUnlockCopy = (shareState = readShareRewards()) => {
  if (shareState.availableUnlocks > 0) return chooseText(uiText.useReward);
  const next = getSharesUntilNextUnlock(shareState);
  if (getLang() === "en") return `${chooseText(uiText.moreSharesPrefix)} ${next} ${chooseText(uiText.moreSharesSuffix)}`;
  return `${chooseText(uiText.moreSharesPrefix)} ${next} ${chooseText(uiText.moreSharesSuffix)}`;
};

const platformDestinations = {
  substack: "https://substack.com/home",
  youtube: "https://studio.youtube.com/",
  xiaohongshu: "https://creator.xiaohongshu.com/",
  tiktok: "https://www.tiktok.com/upload",
};

const injectResponsiveStyles = () => {
  const style = document.createElement("style");
  style.textContent = `
    .work-meta-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:16px}.work-meta-row .work-type{margin-bottom:0}.access-pill{display:inline-flex;border:1px solid rgba(31,94,77,.24);border-radius:999px;padding:4px 10px;background:#fffdf7;color:var(--accent);font-size:12px;font-weight:700}.preview-meter{height:7px;overflow:hidden;border-radius:999px;background:#e9e1d5}.preview-meter span{display:block;width:var(--free-percent);height:100%;border-radius:inherit;background:var(--accent)}.preview-copy{display:block;margin-top:8px;color:var(--muted);font-weight:700}.work-card.gated{background:linear-gradient(180deg,#fffdf7 0%,#fbf7ef 100%)}.subscribe-link{width:fit-content;border-bottom:1px solid rgba(31,94,77,.36)}.access-controls{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,.55fr);gap:14px}.share-actions button[data-share=wechat]{border-color:rgba(31,94,77,.42);background:#eff7f1;color:var(--accent);font-weight:800}.ximalaya-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}.ximalaya-catalog{display:grid;gap:12px;margin-top:18px}.catalog-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.catalog-head a{color:var(--accent);font-weight:700}.ximalaya-catalog iframe{width:100%;min-height:520px;border:1px solid var(--line);border-radius:8px;background:#fffdf7}@media(max-width:820px){.band{width:min(100% - 28px,1120px);padding:58px 0}.section-head{gap:14px;margin-bottom:24px}.work-card,.plan-card,.checkout-panel,.player-panel,.episode-list{padding:18px}.share-actions{gap:6px}.share-actions button{min-height:34px;padding:0 9px}.access-controls{grid-template-columns:1fr}.ximalaya-catalog iframe{min-height:420px}}@media(max-width:520px){h2{font-size:28px}.payment-methods,.filters{display:grid;grid-template-columns:1fr 1fr}.filter,.payment-method{width:100%}.share-actions{display:grid;grid-template-columns:1fr 1fr}.share-actions button{width:100%;border-radius:8px}.work-grid{gap:14px}.price{font-size:30px}.footer{padding:24px 18px}}`;
  document.head.appendChild(style);
};

const workGrid = document.querySelector("#workGrid");
const filterButtons = document.querySelectorAll(".filter");
const workForm = document.querySelector("#workForm");
const subscribeForm = document.querySelector("#subscribeForm");
const subscribeMessage = document.querySelector("#subscribeMessage");
const resetDemo = document.querySelector("#resetDemo");
const year = document.querySelector("#year");

let activeFilter = "all";

const SHARE_REWARD_STORAGE_KEY = "yiten-share-rewards-v1";
const SHARE_REWARD_THRESHOLD = 3;

const createWorkKey = (work) => {
  if (work?.key || work?.workKey) return String(work.key || work.workKey);
  const source = `${work.type || "work"}:${work.title || "untitled"}:${work.url || ""}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return `work-${hash.toString(16)}`;
};

// 分享奖励状态统一走 YitenStore(持久化 + 订阅);read/save 保留原签名,行为等价。
const shareRewardsStore = window.YitenStore.createStore({
  state: { completedShares: 0, availableUnlocks: 0, unlockedWorks: {}, history: [], lastAutoUnlocked: null, updatedAt: "" },
  storage: localStorage,
  storageKey: SHARE_REWARD_STORAGE_KEY,
  storageVersion: 1,
});

const readShareRewards = () => shareRewardsStore.get();

const saveShareRewards = (state) => {
  shareRewardsStore.set({ ...state, updatedAt: new Date().toISOString() });
  window.dispatchEvent(new CustomEvent("yiten:share-reward-updated", { detail: shareRewardsStore.get() }));
};

const isRewardUnlocked = (work) => Boolean(readShareRewards().unlockedWorks[createWorkKey(work)]);

const recordShareReward = (work, platform) => {
  const state = readShareRewards();
  const key = createWorkKey(work);
  state.completedShares += 1;
  if (state.completedShares % SHARE_REWARD_THRESHOLD === 0) {
    if (work && !state.unlockedWorks[key]) {
      state.unlockedWorks[key] = { title: work.title || "完整内容", unlockedAt: new Date().toISOString(), source: "share" };
      state.lastAutoUnlocked = { key, title: work.title || "完整内容", unlockedAt: state.unlockedWorks[key].unlockedAt };
    } else {
      state.availableUnlocks += 1;
    }
  }
  state.history.unshift({
    key,
    title: work.title,
    platform,
    sharedAt: new Date().toISOString(),
  });
  state.history = state.history.slice(0, 50);
  saveShareRewards(state);
  renderShareRewardPanel();
  return state;
};

const unlockWorkWithReward = (work) => {
  const state = readShareRewards();
  const key = createWorkKey(work);
  if (state.unlockedWorks[key]) {
    return { ok: true, message: getLang() === "en" ? "This piece is already unlocked." : "这篇内容已经解锁。" };
  }
  if (state.availableUnlocks < 1) {
    const next = getSharesUntilNextUnlock();
    return {
      ok: false,
      message: getLang() === "en" ? `${next} more shares unlock 1 full piece.` : `还差 ${next} 次分享可获得 1 次解锁。`,
    };
  }
  state.availableUnlocks -= 1;
  state.unlockedWorks[key] = { title: work.title, unlockedAt: new Date().toISOString() };
  saveShareRewards(state);
  renderShareRewardPanel();
  return { ok: true, message: getLang() === "en" ? "Unlocked with your share reward." : "已使用分享奖励解锁这篇完整内容。" };
};

const renderShareRewardPanel = () => {
  if (!workGrid) return;
  const section = document.querySelector("#works .compact-head") || document.querySelector("#works .section-head");
  if (!section) return;
  let panel = document.querySelector("#shareRewardPanel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "shareRewardPanel";
    panel.className = "share-reward-panel";
    section.insertAdjacentElement("afterend", panel);
  }
  const state = readShareRewards();
  const components = window.YitenComponents;
  const copy = {
    title: chooseText(uiText.shareReward),
    rulePrefix: chooseText(uiText.shareRewardRulePrefix),
    ruleSuffix: chooseText(uiText.shareRewardRuleSuffix),
    sharedCount: chooseText(uiText.sharedCount),
    availableUnlocks: chooseText(uiText.availableUnlocks),
    times: chooseText(uiText.times),
    nowUnlockable: chooseText(uiText.nowUnlockable),
    waiting: formatUnlockCopy(state),
    unlockedPrefix: `${getLang() === "en" ? "Unlocked" : "已兑现解锁"}：`,
  };
  panel.innerHTML = components.shareRewardPanel({ state, copy, threshold: SHARE_REWARD_THRESHOLD });
};

const refreshShareRewardViews = () => {
  renderShareRewardPanel();
  if (workGrid) renderWorks();
};

const parseWorkList = (key) => {
  try {
    const works = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(works) ? works : [];
  } catch (_error) {
    return [];
  }
};

const readWorks = () => {
  const primaryWorks = parseWorkList("personal-site-works");
  if (!primaryWorks.length) return defaultWorks;
  try {
    const seen = new Set();
    return primaryWorks.filter((work) => {
      const key = work.id || work.sourceId || createWorkKey(work);
      if (seen.has(key)) return false;
      seen.add(key);
      const status = String(work.status || "").trim().toLowerCase();
      return !work.hidden && (work.published === true || status === "published" || status === "已发布");
    }).map((work) =>
      work.title === "独立创作者工具箱"
        ? {
            ...work,
            title: "从零搭建个人内容资产库",
            summary: "把文章、音频、电子书和研究札记整理成可检索、可复用、可持续更新的长期资料库。",
            access: "metered",
            freePercent: 40,
          }
        : work
    );
  } catch (_error) {
    return defaultWorks;
  }
};

const saveWorks = (works) => {
  localStorage.setItem("personal-site-works", JSON.stringify(works));
  localStorage.setItem("personal-site-works-updated-at", String(Date.now()));
};

const readWorkViews = () => {
  try {
    const views = JSON.parse(localStorage.getItem("yiten-work-views") || "{}");
    return views && typeof views === "object" ? views : {};
  } catch (_error) {
    return {};
  }
};

const recordWorkView = async (work) => {
  const workKey = createWorkKey(work);
  if (!workKey) return;
  const sessionKey = `yiten-viewed:${workKey}`;
  if (sessionStorage.getItem(sessionKey)) return;
  sessionStorage.setItem(sessionKey, "1");
  try {
    const response = await fetch("./api/sync/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workKey,
        title: work.title || "",
        type: work.type || "work",
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.message || "view sync failed");
    const views = readWorkViews();
    views[workKey] = {
      ...(views[workKey] || {}),
      title: work.title || views[workKey]?.title || "",
      type: work.type || views[workKey]?.type || "work",
      count: result.count,
      lastViewedAt: result.lastViewedAt || new Date().toISOString(),
    };
    localStorage.setItem("yiten-work-views", JSON.stringify(views));
  } catch (error) {
    console.warn("Yiten view tracking failed", error);
  }
};

const readBookProducts = () => {
  try {
    const products = JSON.parse(localStorage.getItem("yiten-book-products") || "{}");
    return products && typeof products === "object" ? products : {};
  } catch (_error) {
    return {};
  }
};

const isPublishedProduct = (product) => Boolean(product && (product.status === "published" || product.status === "已发布" || product.published === true));
const getCoverSrc = (cover) => window.YitenComponents.coverSrc(cover);

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

const safePublicClientUrl = (value, { allowHash = true } = {}) => {
  const candidate = String(value || "").trim();
  if (!candidate) return "";
  if (allowHash && candidate.startsWith("#")) return candidate;
  if (candidate.startsWith("/") && (candidate.startsWith("//") || candidate.includes("\\"))) return "";
  try {
    const url = new URL(candidate, location.origin);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch (_error) {
    return "";
  }
};

const formatPublishedAt = (work) => {
  const value = work.publishedAt || work.updatedAt || work.createdAt || "";
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const locale = getLang() === "en" ? "en-US" : "zh-CN";
  const text = date.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
  return getLang() === "en" ? `Published ${text}` : `发布于 ${text}`;
};

const normalizeWorkType = (type) => {
  const value = String(type || "").toLowerCase();
  if (value.includes("audio") || value.includes("podcast") || value.includes("音频") || value.includes("播客")) return "audio";
  if (value.includes("note") || value.includes("札记")) return "note";
  if (value.includes("project") || value.includes("项目")) return "project";
  return "essay";
};

const normalizeWork = (work) => {
  const access = work.access || "metered";
  const fallbackPercent = access === "free" ? 100 : access === "member" ? 20 : 35;
  const freePercent = Number.isFinite(Number(work.freePercent))
    ? Math.max(0, Math.min(100, Number(work.freePercent)))
    : fallbackPercent;
  return { ...work, url: safePublicClientUrl(work.url) || "#works", access, freePercent };
};

const stripMarkdownMarks = (value) =>
  String(value || "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();

const normalizeWhitespace = (value) => String(value || "").replace(/\s+/g, " ").trim();

const bodyLooksLikeHtml = (value) => /<\/?[a-z][\s\S]*>/i.test(String(value || ""));

const htmlToPlainText = (value) => {
  const template = document.createElement("template");
  template.innerHTML = String(value || "");
  return normalizeWhitespace(template.content.textContent || "");
};

const sanitizePublishedHtml = (html) => {
  const template = document.createElement("template");
  template.innerHTML = String(html || "");
  const allowedTags = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "H2", "H3", "H4", "UL", "OL", "LI", "BLOCKQUOTE", "A", "IMG", "SPAN"]);
  const allowedAttributes = {
    A: new Set(["href", "target", "rel"]),
    IMG: new Set(["src", "alt"]),
    SPAN: new Set(["style"]),
  };
  const walk = (node) => {
    Array.from(node.children).forEach((child) => {
      if (!allowedTags.has(child.tagName)) {
        child.replaceWith(document.createTextNode(child.textContent || ""));
        return;
      }
      Array.from(child.attributes).forEach((attribute) => {
        const allowed = allowedAttributes[child.tagName]?.has(attribute.name);
        if (!allowed) child.removeAttribute(attribute.name);
      });
      if (child.tagName === "A") {
        const href = child.getAttribute("href") || "";
        if (!/^https?:\/\//i.test(href) && !href.startsWith("#") && !href.startsWith("mailto:")) child.removeAttribute("href");
        child.setAttribute("rel", "noreferrer");
      }
      if (child.tagName === "IMG") {
        const src = safePublicClientUrl(child.getAttribute("src"), { allowHash: false });
        if (src) child.setAttribute("src", src);
        else child.removeAttribute("src");
        child.setAttribute("loading", "lazy");
      }
      if (child.tagName === "SPAN") {
        const style = child.getAttribute("style") || "";
        const fontSize = style.match(/font-size\s*:\s*(\d{1,2}px|[0-2](?:\.\d)?rem)/i)?.[0];
        if (fontSize) child.setAttribute("style", fontSize);
        else child.removeAttribute("style");
      }
      walk(child);
    });
  };
  walk(template.content);
  return template.innerHTML;
};

const formatPublishedBody = (work, rewardUnlocked) => {
  const rawBody = String(work.body || "");
  const isHtml = work.bodyFormat === "html" || bodyLooksLikeHtml(rawBody);
  const body = isHtml ? htmlToPlainText(rawBody) : stripMarkdownMarks(rawBody);
  if (!body) return "";
  const shouldPreview = work.access !== "free" && !rewardUnlocked;
  if (!shouldPreview && isHtml) return sanitizePublishedHtml(rawBody);
  const visibleLength = shouldPreview
    ? Math.max(80, Math.round(body.length * (Number(work.freePercent) || 35) / 100))
    : body.length;
  const content = body.slice(0, visibleLength);
  const suffix = shouldPreview && content.length < body.length ? "\n\n……订阅或使用分享奖励后可继续阅读。" : "";
  return escapeHtml(`${content}${suffix}`).replace(/\n/g, "<br />");
};

const renderAttachments = (attachments = []) => {
  const list = Array.isArray(attachments) ? attachments : [];
  if (!list.length) return "";
  return `<div class="work-attachments"><span>含 ${list.length} 个配套附件</span></div>`;
};

const isAudioSource = (value = "") =>
  /\.(mp3|m4a|wav|aac|ogg|oga|flac)(\?.*)?$/i.test(String(value));

const isLikelyPlayableMediaUrl = (value = "") =>
  Boolean(safePublicClientUrl(value, { allowHash: false }));

const inferAudioSource = (work) => {
  const normalizedType = normalizeWorkType(work.type);
  const direct =
    work.audioUrl ||
    work.audio?.url ||
    work.audio?.src ||
    work.audio?.dataUrl ||
    work.audioFile?.url ||
    work.audioFile?.src ||
    work.audioFile?.dataUrl ||
    work.mediaUrl ||
    work.file?.url ||
    work.file?.src ||
    work.file?.dataUrl ||
    work.sourceUrl;
  const safeDirect = safePublicClientUrl(direct, { allowHash: false });
  if (safeDirect && (isAudioSource(safeDirect) || (normalizedType === "audio" && isLikelyPlayableMediaUrl(safeDirect)))) return safeDirect;
  const attachment = Array.isArray(work.attachments)
    ? work.attachments.find((item) => isAudioSource(item?.dataUrl || item?.url || item?.src || item?.href || item?.name))
    : null;
  const attachmentSrc = safePublicClientUrl(attachment?.url || attachment?.src || attachment?.href, { allowHash: false });
  if (attachmentSrc && isAudioSource(attachmentSrc)) return attachmentSrc;
  const safeWorkUrl = safePublicClientUrl(work.url, { allowHash: false });
  if (normalizedType === "audio" && safeWorkUrl && isLikelyPlayableMediaUrl(safeWorkUrl)) return safeWorkUrl;
  return "";
};

const hasPlayableAudioWhenNeeded = (work) =>
  normalizeWorkType(work.type) !== "audio" || Boolean(inferAudioSource(work));

const renderBookProducts = () => {
  const products = readBookProducts();
  const single = isPublishedProduct(products.single) ? products.single : null;
  const bundle = isPublishedProduct(products.bundle) ? products.bundle : null;
  const extraList = Array.isArray(products.extraProducts) ? products.extraProducts : [];
  const extras = [products.extra1, products.extra2, ...extraList].filter((product) => isPublishedProduct(product) && product.title);
  // extra1 / extra2 现已绑到单品卡 2 / 3，下方网格只放「3 本之外」的动态附加商品。
  const gridExtras = extraList.filter((product) => isPublishedProduct(product) && product.title);
  const hasConfiguredProducts = Object.keys(products).length > 0;

  // 用户端只展示 owner 后台「已发布且有标题」的单品；其余整张卡隐藏，绝不露写死占位。
  const isLiveProduct = (product) => isPublishedProduct(product) && Boolean(product && product.title);
  const singleSlots = [products.single, products.extra1, products.extra2];
  document.querySelectorAll(".single-book-grid .single-book-card").forEach((card, index) => {
    card.hidden = !isLiveProduct(singleSlots[index]);
  });
  const singleGrid = document.querySelector(".single-book-grid");
  if (singleGrid) singleGrid.hidden = !singleSlots.some((product) => isLiveProduct(product));
  // 没有任何已发布商品时，整个"书籍"区在用户端隐藏，绝不留空壳或写死样例。
  const booksSection = document.querySelector("#books");
  if (booksSection) booksSection.hidden = !(isLiveProduct(products.bundle) || singleSlots.some((product) => isLiveProduct(product)));

  const mainProductCard = document.querySelector(".bookstore-combo-card");
  const bookCover = document.querySelector("[data-book-cover]");
  const suiteCoverImages = document.querySelectorAll(".suite-cover img");
  const bookTitle = document.querySelector("[data-book-title]");
  const bookDescription = document.querySelector("[data-book-description]");
  const bookPoints = document.querySelector("[data-book-points]");
  const bookFormats = document.querySelector("[data-book-formats]");
  const singleNote = document.querySelector("[data-single-note]");
  const singleCover = document.querySelector("[data-single-cover]");
  const singleTitle = document.querySelector("[data-single-title]");
  const singleDescription = document.querySelector("[data-single-description]");
  const singlePoints = document.querySelector("[data-single-points]");
  const bundleDescription = document.querySelector("[data-bundle-description]");
  const bundleStack = document.querySelector("[data-bundle-stack]");
  const bundleCoverWrap = document.querySelector("[data-bundle-cover-wrap]");
  const bundleCover = document.querySelector("[data-bundle-cover]");
  const extraProductGrid = document.querySelector("#extraProductGrid");
  const singleVisitorPrice = document.querySelector("[data-single-visitor-price]");
  const singleMemberPrice = document.querySelector("[data-single-member-price]");
  const bundleVisitorPrice = document.querySelector("[data-bundle-visitor-price]");
  const bundleMemberPrice = document.querySelector("[data-bundle-member-price]");
  const formatPrice = (value) => window.YitenComponents.formatPrice(value);

  // 单品卡 2 / 3：从后台「单本二 / 单本三」(extra1 / extra2) 数据驱动，
  // 镜像单品卡 1 的结构；未发布时保留页面默认文案，绝不留空。
  const bindSingleProductCard = (product, suffix) => {
    if (!isPublishedProduct(product) || !product.title) return;
    const pick = (name) => document.querySelector(`[data-single${suffix}-${name}]`);
    const data = window.YitenComponents.bookProductData(product);
    if (!data) return;
    const coverEl = pick("cover");
    if (data.cover && coverEl) coverEl.src = data.cover;
    const titleEl = pick("title");
    if (titleEl) titleEl.textContent = data.title;
    const descEl = pick("description");
    if (data.description && descEl) descEl.textContent = data.description;
    const pointsEl = pick("points");
    if (pointsEl && data.points.length) pointsEl.innerHTML = data.points.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    const visitorEl = pick("visitor-price");
    if (data.visitorPrice !== null && visitorEl) visitorEl.textContent = formatPrice(data.visitorPrice);
    const memberEl = pick("member-price");
    if (data.memberPrice !== null && memberEl) memberEl.textContent = formatPrice(data.memberPrice);
  };
  bindSingleProductCard(products.extra1, "2");
  bindSingleProductCard(products.extra2, "3");

  if (mainProductCard) {
    mainProductCard.hidden = hasConfiguredProducts && !single && !bundle;
  }

  if (!single && !bundle && !extras.length) return;

  // 纯数据驱动小工具：有真数据才显示，空就清空+隐藏（绝不回退到写死样例）。
  const setText = (el, value) => { if (el) { el.textContent = value || ""; el.hidden = !value; } };
  const splitList = (value) => String(value || "").split(/[\n,，、/]+/).map((s) => s.trim()).filter(Boolean);
  const setList = (el, items) => {
    if (!el) return;
    const list = (items || []).slice(0, 8);
    const tag = el.tagName === "UL" || el.tagName === "OL" ? "li" : "span";
    el.innerHTML = list.map((item) => `<${tag}>${escapeHtml(item)}</${tag}>`).join("");
    el.hidden = !list.length;
  };
  const fileExts = (files) => Array.isArray(files)
    ? Array.from(new Set(files.map((f) => (f.name || "").split(".").pop()?.toUpperCase()).filter(Boolean)))
    : [];

  // —— 套装卡：无套装(无标题)整卡隐藏，其余字段有数据才显示 ——
  if (mainProductCard) mainProductCard.hidden = !(bundle && bundle.title);
  const suiteCoverSrc = getCoverSrc(bundle?.cover || bundle?.coverUrl) || getCoverSrc(single?.cover || single?.coverUrl);
  if (suiteCoverSrc) {
    if (bookCover) bookCover.src = suiteCoverSrc;
    suiteCoverImages.forEach((image, index) => { if (index === 0 || !image.dataset.staticCover) image.src = suiteCoverSrc; });
  }
  setText(bookTitle, bundle?.title);
  setText(bundleDescription, bundle?.description);
  setList(bundleStack, splitList(bundle?.includes));
  setList(bookFormats, splitList(bundle?.formats).length ? splitList(bundle?.formats) : fileExts(bundle?.files));
  if (bundleVisitorPrice) bundleVisitorPrice.textContent = bundle?.visitorPrice ? formatPrice(bundle.visitorPrice) : "";
  if (bundleMemberPrice) bundleMemberPrice.textContent = bundle?.memberPrice ? formatPrice(bundle.memberPrice) : "";

  // —— 单品卡 1（single）：字段有数据才显示 ——
  const singleCoverSrc = getCoverSrc(single?.cover || single?.coverUrl);
  if (singleCoverSrc && singleCover) singleCover.src = singleCoverSrc;
  setText(singleTitle, single?.title);
  setText(singleDescription, single?.description);
  setList(singlePoints, splitList(single?.includes));
  if (singleVisitorPrice) singleVisitorPrice.textContent = single?.visitorPrice ? formatPrice(single.visitorPrice) : "";
  if (singleMemberPrice) singleMemberPrice.textContent = single?.memberPrice ? formatPrice(single.memberPrice) : "";

  if (extraProductGrid) {
    extraProductGrid.innerHTML = gridExtras
      .map((product, index) => {
        const slot = product.slot === "extra1" || product.slot === "extra2"
          ? product.slot
          : `extra-dynamic-${index + 1}`;
        const data = window.YitenComponents.bookProductData(product);
        const cover = data.cover || "./public/ebook-cover.svg";
        const formats = data.formats.slice(0, 4);
        return `
          <article class="extra-product-card">
            <figure><img src="${escapeAttribute(cover)}" alt="${escapeAttribute(data.title)} 缩略图" /></figure>
            <div>
              <span class="plan-tag quiet">新上架</span>
              <h3>${escapeHtml(data.title)}</h3>
              <p>${escapeHtml(data.description || "创作者上架的补充资料包。")}</p>
              ${formats.length ? `<div class="format-pills">${formats.map((format) => `<span>${escapeHtml(format)}</span>`).join("")}</div>` : ""}
            </div>
            <div class="extra-product-actions">
              <strong>${formatPrice(data.visitorPrice !== null ? data.visitorPrice : 29)}</strong>
              <button class="button primary ebook-button" data-audience="${slot}" type="button">购买</button>
            </div>
          </article>
        `;
      })
      .join("");
  }
};

const enhanceWorkForm = () => {
  if (!workForm || workForm.querySelector("[name='access']")) return;
  const wrapper = document.createElement("div");
  wrapper.className = "access-controls";
  wrapper.innerHTML = `
    <label>可见范围
      <select name="access">
        <option value="metered">部分免费，订阅解锁剩余内容</option>
        <option value="free">游客免费阅读全文/完整收听</option>
        <option value="member">会员专属，仅开放少量试看</option>
      </select>
    </label>
    <label>免费试看比例
      <input name="freePercent" type="number" min="0" max="100" value="35" />
    </label>
  `;
  const summary = workForm.querySelector("textarea[name='summary']")?.closest("label");
  if (summary) summary.insertAdjacentElement("afterend", wrapper);
};

const buildDistributionText = (work, target = "default") => {
  const normalized = normalizeWork(work);
  const lockLine = normalized.access === "free"
    ? "全文免费阅读。"
    : `可免费试看 ${normalized.freePercent}%，剩余内容订阅后解锁。`;
  const prefix = target === "wechat" ? "我在 Yiten Huang 看到一篇值得读的内容：" : "Yiten Huang 新作品：";
  return `${prefix}\n\n${normalized.title}\n\n${normalized.summary}\n\n${lockLine}\n\n阅读全文：${normalized.url}`;
};

const copyDistributionText = async (work, target) => {
  await navigator.clipboard.writeText(buildDistributionText(work, target));
};

const buildShareUrl = (platform, work) => {
  const normalized = normalizeWork(work);
  const url = encodeURIComponent(normalized.url);
  const title = encodeURIComponent(normalized.title);
  const text = encodeURIComponent(`${normalized.title} - ${normalized.summary}`);
  const shareTargets = {
    x: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    weibo: `https://service.weibo.com/share/share.php?url=${url}&title=${text}`,
    telegram: `https://t.me/share/url?url=${url}&text=${title}`,
    email: `mailto:?subject=${title}&body=${text}%0A%0A${url}`,
  };
  return shareTargets[platform];
};

const shareWork = async (platform, work) => {
  if (platform === "native" && navigator.share) {
    const normalized = normalizeWork(work);
    try {
      await navigator.share({ title: normalized.title, text: normalized.summary, url: normalized.url });
      return "已打开系统分享";
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      await copyDistributionText(work);
      return "系统分享不可用，已复制分发文案";
    }
  }

  if (platform === "native") {
    await copyDistributionText(work);
    return "已复制分发文案";
  }

  if (platform === "copy") {
    await copyDistributionText(work);
    return "已复制分发文案";
  }

  if (platform === "wechat") {
    await copyDistributionText(work, "wechat");
    return "已复制微信文案";
  }

  if (platformDestinations[platform]) {
    await copyDistributionText(work);
    window.open(platformDestinations[platform], "_blank", "noopener,noreferrer");
    return "已复制文案并打开平台后台";
  }

  const shareUrl = buildShareUrl(platform, work);
  if (shareUrl) {
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    return "已打开分享窗口";
  }
  return "该平台暂未配置";
};

const renderWorks = () => {
  const works = readWorks().map(normalizeWork).filter(hasPlayableAudioWhenNeeded);
  const visibleWorks =
    activeFilter === "all" ? works : works.filter((work) => work.type === activeFilter);

  workGrid.innerHTML = visibleWorks
    .map((work, index) => {
      const locked = work.access !== "free";
      const progressStyle = `style="--free-percent: ${work.freePercent}%"`;
      const rewardUnlocked = locked && isRewardUnlocked(work);
      const shareState = readShareRewards();
      const unlockCopy = formatUnlockCopy(shareState);
      const title = translateText(work.title);
      const summary = translateText(work.summary);
      const typeLabel = chooseText(labels[work.type]) || chooseText(uiText.fallbackWork);
      const accessLabel = rewardUnlocked ? chooseText(uiText.rewardUnlocked) : chooseText(accessLabels[work.access]) || chooseText(accessLabels.metered);
      const originalLabel = getLang() === "en" ? "Original" : "原创";
      const copyrightLabel = getLang() === "en" ? "Local fingerprint" : "版权指纹";
      const publishedAt = formatPublishedAt(work);
      const previewText = formatPreviewText(work, rewardUnlocked);
      const inlineBody = formatPublishedBody(work, rewardUnlocked);
      const workKey = createWorkKey(work);
      const fallbackBody = !inlineBody && summary
        ? `<p>${escapeHtml(summary)}</p>`
        : "";
      const bodyBlock = inlineBody || fallbackBody
        ? `<details class="published-body work-body-details" id="${escapeAttribute(work.id || workKey)}"><summary>${rewardUnlocked || work.access === "free" ? "展开完整内容" : "展开免费试看"}</summary><div class="published-body-content">${inlineBody || fallbackBody}</div></details>`
        : "";
      const audioSource = inferAudioSource(work);
      const isAudioWork = work.type === "audio";
      const missingAudioHint = work.audioFile?.name || work.fileName
        ? "这条旧数据只保存了文件名，没有远程音频 URL；请在后台重新上传一次音频，或补一个可直接播放的音频地址。"
        : "请在后台上传音频文件，或填写可直接播放的音频地址。";
      const audioBlock = audioSource
        ? `<div class="audio-player-shell"><span class="audio-play-label">播放音频</span><audio class="work-audio-player" controls preload="metadata" src="${escapeAttribute(audioSource)}"></audio></div>`
        : isAudioWork
          ? `<div class="audio-player-shell audio-missing"><strong>暂无可播放音频</strong><small>${escapeHtml(missingAudioHint)}</small></div>`
          : "";
      const workUrl = hasExpandableContent ? `#${escapeAttribute(work.id || createWorkKey(work))}` : escapeAttribute(work.url);
      const linkTarget = hasExpandableContent ? "" : ` target="_blank" rel="noreferrer"`;
      return window.YitenComponents.workCard({
        work,
        title,
        summary,
        typeLabel,
        accessLabel,
        originalLabel,
        copyrightLabel,
        publishedAt,
        previewText,
        inlineBody,
        fallbackBody,
        audioSource,
        isAudioWork,
        missingAudioHint,
        unlockCopy,
        shareState,
        rewardUnlocked,
        locked,
        index,
        workKey,
        url: work.url,
        coverUrl: safePublicClientUrl(work.cover || work.coverUrl || ""),
        shareLabels: Object.fromEntries(Object.entries(platformButtonLabels).map(([key, label]) => [key, chooseText(label)])),
        uiLabels: {
          readPreview: chooseText(uiText.readPreview),
          readFull: chooseText(uiText.readFull),
          subscribeUnlock: chooseText(uiText.subscribeUnlock),
          shareAria: chooseText(uiText.shareAria),
          shareTextLabel: chooseText(uiText.shareTextLabel),
          shareHint: chooseText(uiText.shareHint),
        },
      });
    })
    .join("");

  workGrid.querySelectorAll(".work-card").forEach((card) => {
    const work = visibleWorks[Number(card.dataset.index)];
    if (!work) return;
    const onView = () => recordWorkView(work);
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.6)) {
          observer.disconnect();
          onView();
        }
      }, { threshold: [0.6] });
      observer.observe(card);
    } else {
      onView();
    }
  });
};

window.YitenShareRewards = {
  record(work, platform) {
    const state = recordShareReward(
      {
        key: work?.key || work?.workKey,
        title: work?.title || "分享内容",
        type: work?.type || "work",
        url: work?.url || location.href,
      },
      platform || "share"
    );
    renderWorks();
    return state;
  },
  read: readShareRewards,
  refresh() {
    refreshShareRewardViews();
  },
};

window.addEventListener("storage", (event) => {
  if ([SHARE_REWARD_STORAGE_KEY, "personal-site-works", "yiten-published-works", "yiten-creator-published-works", "personal-site-works-updated-at"].includes(event.key)) {
    refreshShareRewardViews();
    renderWorks();
  }
});
window.addEventListener("focus", refreshShareRewardViews);
window.addEventListener("pageshow", refreshShareRewardViews);
window.addEventListener("yiten:share-reward-refresh", refreshShareRewardViews);
window.addEventListener("yiten:share-reward-updated", () => {
  renderShareRewardPanel();
});
window.addEventListener("yiten-sync-updated", (event) => {
  const keys = event.detail?.keys || [];
  const shouldRefreshWorks = keys.some((key) =>
    ["personal-site-works", "personal-site-works-updated-at", "yiten-share-rewards-v1"].includes(key) ||
    String(key).startsWith("yiten-creator-work:")
  );
  const shouldRefreshBooks = keys.some((key) =>
    ["yiten-book-products", "yiten-book-products-updated-at"].includes(key) ||
    String(key).startsWith("yiten-creator-books:")
  );
  if (shouldRefreshBooks) renderBookProducts();
  if (shouldRefreshWorks) {
    refreshShareRewardViews();
    renderWorks();
  }
});

workGrid.addEventListener("click", async (event) => {
  const unlockButton = event.target.closest("[data-unlock-work]");
  if (unlockButton) {
    const card = unlockButton.closest(".work-card");
    const works = activeFilter === "all" ? readWorks().map(normalizeWork) : readWorks().map(normalizeWork).filter((work) => work.type === activeFilter);
    const work = works[Number(card.dataset.index)];
    if (!work) return;
    const result = unlockWorkWithReward(work);
    unlockButton.textContent = result.message;
    renderWorks();
    return;
  }

  const inlineWorkLink = event.target.closest(".work-link[href^='#']");
  if (inlineWorkLink && !inlineWorkLink.classList.contains("subscribe-link")) {
    const target = document.querySelector(inlineWorkLink.getAttribute("href"));
    if (target?.matches("details")) {
      event.preventDefault();
      target.open = true;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
  }

  const button = event.target.closest("[data-share]");
  if (!button) return;
  const card = button.closest(".work-card");
  const works = activeFilter === "all" ? readWorks().map(normalizeWork) : readWorks().map(normalizeWork).filter((work) => work.type === activeFilter);
  const work = works[Number(card.dataset.index)];
  if (!work) return;

  const previousText = button.textContent;
  const state = recordShareReward(work, button.dataset.share);
  const rewardMessage = state.completedShares % SHARE_REWARD_THRESHOLD === 0
    ? "已获得 1 次完整内容解锁"
    : formatUnlockCopy(state);
  button.textContent = rewardMessage;
  renderWorks();
  try {
    const message = await shareWork(button.dataset.share, work);
    const currentButton = workGrid.querySelector(`.work-card[data-index="${card.dataset.index}"] [data-share="${button.dataset.share}"]`);
    if (currentButton) currentButton.textContent = message;
    window.setTimeout(() => {
      const resetButton = workGrid.querySelector(`.work-card[data-index="${card.dataset.index}"] [data-share="${button.dataset.share}"]`);
      if (resetButton) resetButton.textContent = previousText;
    }, 1800);
  } catch (error) {
    console.warn("Share failed", error);
    const currentButton = workGrid.querySelector(`.work-card[data-index="${card.dataset.index}"] [data-share="${button.dataset.share}"]`);
    if (currentButton) currentButton.textContent = "已记录分享";
    window.setTimeout(() => {
      const resetButton = workGrid.querySelector(`.work-card[data-index="${card.dataset.index}"] [data-share="${button.dataset.share}"]`);
      if (resetButton) resetButton.textContent = previousText;
    }, 1800);
  }
});

window.YitenEvents.delegate(document, ".filter", "click", (_event, button) => {
  activeFilter = button.dataset.filter;
  filterButtons.forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  renderWorks();
});

const diagnosticTools = window.YitenComponents.diagnosticTools;

const updateDiagnosticTool = (tool = "cashflow", shouldDispatch = true) => {
  const active = diagnosticTools[tool] || diagnosticTools.cashflow;
  document.querySelectorAll("[data-tool-card]").forEach((card) => {
    card.classList.toggle("active", card.dataset.toolCard === tool);
  });
  const progress = document.querySelector(".diagnostic-progress span");
  const label = document.querySelector("#diagnosticLabel");
  const title = document.querySelector("#diagnosticTitle");
  const copy = document.querySelector("#diagnosticCopy");
  const questions = document.querySelector("#diagnosticQuestions");
  const signal = document.querySelector("#diagnosticSignal");
  const cta = document.querySelector(".diagnostic-signal [data-tool-start]");
  const feedback = document.querySelector("#toolFeedback");
  const checkupTitle = document.querySelector("#checkupTitle");
  const checkupDescription = document.querySelector("#checkupDescription");

  if (progress) progress.style.width = active.progress;
  if (label) label.textContent = active.step;
  if (title) title.textContent = active.title;
  if (copy) copy.textContent = active.copy;
  if (questions) questions.innerHTML = active.questions.map((item) => `<span>${escapeHtml(item)}</span>`).join("");
  if (signal) signal.textContent = active.signal;
  if (cta) {
    cta.dataset.toolStart = tool;
    cta.textContent = `进入${active.title}`;
  }
  if (feedback) feedback.textContent = active.feedback;
  if (checkupTitle) checkupTitle.textContent = active.checkupTitle;
  if (checkupDescription) checkupDescription.textContent = active.checkupDescription;
  if (shouldDispatch) window.dispatchEvent(new CustomEvent("yiten:tool-start", { detail: { tool } }));
};

window.YitenEvents.delegate(document, "[data-tool-start]", "click", (_event, link) => {
  updateDiagnosticTool(link.dataset.toolStart || "cashflow", true);
});

updateDiagnosticTool("cashflow", false);

workForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(workForm);
  const access = formData.get("access") || "metered";
  const work = {
    title: formData.get("title").trim(),
    type: formData.get("type"),
    url: formData.get("url").trim(),
    summary: formData.get("summary").trim(),
    access,
    freePercent: access === "free" ? 100 : Number(formData.get("freePercent") || 35),
  };

  const works = [normalizeWork(work), ...readWorks().map(normalizeWork)];
  saveWorks(works);
  workForm.reset();
  enhanceWorkForm();
  activeFilter = "all";
  filterButtons.forEach((item) => {
    item.classList.toggle("active", item.dataset.filter === "all");
  });
  renderWorks();
  document.querySelector("#works").scrollIntoView({ behavior: "smooth" });
});

subscribeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = new FormData(subscribeForm).get("email");
  const result = window.YitenComponents.subscribeEmail(email, { storage: localStorage, storageKey: "personal-site-subscribers" });
  subscribeMessage.textContent = result.message;
  if (result.ok) subscribeForm.reset();
});

resetDemo?.addEventListener("click", () => {
  localStorage.removeItem("personal-site-works");
  activeFilter = "all";
  filterButtons.forEach((item) => {
    item.classList.toggle("active", item.dataset.filter === "all");
  });
  renderWorks();
});

window.addEventListener("yiten:languagechange", () => {
  renderShareRewardPanel();
  renderBookProducts();
  renderWorks();
});
window.addEventListener("storage", (event) => {
  if (event.key === "yiten-book-products" || event.key === "yiten-book-products-updated-at") {
    renderBookProducts();
  }
});

let worksSnapshot = [
  localStorage.getItem("personal-site-works") || "",
  localStorage.getItem("yiten-published-works") || "",
  localStorage.getItem("yiten-creator-published-works") || "",
  localStorage.getItem("personal-site-works-updated-at") || "",
].join("|");

const refreshWorksIfChanged = () => {
  const nextSnapshot = [
    localStorage.getItem("personal-site-works") || "",
    localStorage.getItem("yiten-published-works") || "",
    localStorage.getItem("yiten-creator-published-works") || "",
    localStorage.getItem("personal-site-works-updated-at") || "",
  ].join("|");
  if (nextSnapshot === worksSnapshot) return;
  worksSnapshot = nextSnapshot;
  refreshShareRewardViews();
  renderWorks();
};

window.addEventListener("focus", refreshWorksIfChanged);
window.addEventListener("pageshow", refreshWorksIfChanged);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshWorksIfChanged();
});
window.setInterval(refreshWorksIfChanged, 2500);

// ---- 联系客服悬浮入口 ----
const readContactConfig = () => {
  try {
    const cfg = JSON.parse(localStorage.getItem("yiten-contact-config") || "{}");
    return cfg && typeof cfg === "object" ? cfg : {};
  } catch (_error) {
    return {};
  }
};

const renderContactWidget = () => {
  const widget = document.querySelector("[data-contact-widget]");
  if (!widget) return;
  const cfg = readContactConfig();
  const wechatId = String(cfg.wechatId || "").trim();
  const wechatQr = safePublicClientUrl(cfg.wechatQr?.url || (typeof cfg.wechatQr === "string" ? cfg.wechatQr : ""), { allowHash: false });
  const whatsapp = String(cfg.whatsapp || "").trim();
  const hasWechat = Boolean(wechatId || wechatQr);
  const hasWhatsapp = Boolean(whatsapp);
  const enabled = cfg.enabled === true && (hasWechat || hasWhatsapp);
  widget.hidden = !enabled;
  if (!enabled) return;

  const wechatBlock = widget.querySelector("[data-contact-wechat]");
  if (wechatBlock) {
    wechatBlock.hidden = !hasWechat;
    const qr = widget.querySelector("[data-contact-wechat-qr]");
    if (qr) {
      if (wechatQr) { qr.src = wechatQr; qr.hidden = false; } else { qr.hidden = true; qr.removeAttribute("src"); }
    }
    const idRow = widget.querySelector("[data-contact-wechat-id-row]");
    const idEl = widget.querySelector("[data-contact-wechat-id]");
    if (idRow && idEl) {
      if (wechatId) { idEl.textContent = wechatId; idRow.hidden = false; } else { idRow.hidden = true; }
    }
    const note = widget.querySelector("[data-contact-wechat-note]");
    if (note) { note.textContent = cfg.wechatNote || ""; note.hidden = !cfg.wechatNote; }
  }

  const waLink = widget.querySelector("[data-contact-whatsapp]");
  if (waLink) {
    waLink.hidden = !hasWhatsapp;
    if (hasWhatsapp) {
      const digits = whatsapp.replace(/[^0-9]/g, "");
      waLink.href = `https://wa.me/${digits}`;
      const note = waLink.querySelector("[data-contact-whatsapp-note]");
      if (note) { note.textContent = cfg.whatsappNote || ""; note.hidden = !cfg.whatsappNote; }
    }
  }
};

const setupContactWidget = () => {
  const widget = document.querySelector("[data-contact-widget]");
  if (!widget || widget.dataset.bound) return;
  widget.dataset.bound = "1";
  const panel = widget.querySelector("[data-contact-panel]");
  const openBtn = widget.querySelector("[data-contact-open]");
  const toggle = (show) => {
    if (panel) panel.hidden = !show;
    openBtn?.setAttribute("aria-expanded", String(show));
  };
  openBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggle(panel?.hidden);
  });
  widget.querySelector("[data-contact-close]")?.addEventListener("click", () => toggle(false));
  document.addEventListener("click", (event) => {
    if (!widget.contains(event.target)) toggle(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") toggle(false);
  });
  widget.querySelector("[data-contact-wechat-copy]")?.addEventListener("click", async () => {
    const button = widget.querySelector("[data-contact-wechat-copy]");
    const id = widget.querySelector("[data-contact-wechat-id]")?.textContent || "";
    try {
      await navigator.clipboard.writeText(id);
      const original = button.textContent;
      button.textContent = "已复制";
      window.setTimeout(() => { button.textContent = original; }, 1500);
    } catch (_error) { /* 剪贴板不可用时忽略 */ }
  });
};

window.addEventListener("yiten-sync-updated", (event) => {
  if ((event.detail?.keys || []).includes("yiten-contact-config")) renderContactWidget();
});

injectResponsiveStyles();
renderShareRewardPanel();
enhanceWorkForm();
year.textContent = new Date().getFullYear();
renderBookProducts();
renderWorks();
setupContactWidget();
renderContactWidget();
