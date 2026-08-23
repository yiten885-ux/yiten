const {
  getPrivateText,
  getStateToken,
  isStateConfigured,
  putBlob,
} = require("./blob-store");

const statePathname = "state/yiten-site-state.json";

const publicKeys = new Set([
  "personal-site-works",
  "personal-site-works-updated-at",
  "yiten-book-products",
  "yiten-book-products-updated-at",
  "yiten-contact-config",
]);

const privateKeys = new Set([
  ...publicKeys,
  "yiten-creator-accounts",
  "yiten-creator-review-queue",
  "yiten-creator-content-review-queue",
  "yiten-creator-invites",
  "yiten-review-updated-at",
  "personal-site-subscribers",
  "yiten-share-rewards-v1",
  "yiten-work-views",
  "yiten-offer",
  "yiten-admin-draft",
]);

const privateKeyPrefixes = [
  "yiten-creator-work:",
  "yiten-creator-books:",
  "yiten-creator-offers:",
];

let memoryState = { version: 1, items: {} };

const isPublicKey = (key) => publicKeys.has(String(key || ""));
const isPrivateKey = (key) => {
  const normalized = String(key || "");
  return privateKeys.has(normalized) || privateKeyPrefixes.some((prefix) => normalized.startsWith(prefix));
};

const readState = async () => {
  if (!isStateConfigured()) return memoryState;
  const text = await getPrivateText(statePathname, getStateToken());
  if (!text) return { version: 1, items: {} };
  const parsed = JSON.parse(text);
  return parsed && typeof parsed === "object"
    ? { version: 1, items: {}, ...parsed }
    : { version: 1, items: {} };
};

const writeState = async (state) => {
  const next = { version: 1, items: {}, ...state, savedAt: new Date().toISOString() };
  if (!isStateConfigured()) {
    memoryState = next;
    return next;
  }
  await putBlob({
    pathname: statePathname,
    body: JSON.stringify(next),
    contentType: "application/json; charset=utf-8",
    access: "private",
    allowOverwrite: true,
    token: getStateToken(),
  });
  return next;
};

const safeJsonParse = (value, fallback) => {
  try {
    const parsed = JSON.parse(value || "");
    return parsed ?? fallback;
  } catch (_error) {
    return fallback;
  }
};

const readItemJson = (state, key, fallback) =>
  safeJsonParse(state.items?.[key]?.value, fallback);

const safePublicUrl = (value) => {
  const candidate = String(value || "").trim();
  if (!candidate) return "";
  if (candidate.startsWith("#")) return candidate;
  if (candidate.startsWith("/") && !candidate.startsWith("//") && !candidate.includes("\\")) {
    return candidate;
  }
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch (_error) {
    return "";
  }
};

const isPublished = (value) => {
  const status = String(value?.status || "").trim().toLowerCase();
  if (value?.hidden === true || value?.published === false || ["draft", "hidden", "草稿", "已隐藏"].includes(status)) return false;
  return value?.published === true || ["published", "已发布"].includes(status);
};

const safePublicAuthor = (value) => {
  const author = String(value || "").trim().slice(0, 120);
  return /[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+/.test(author) ? "" : author;
};

const normalizeViewKey = (value) => {
  const normalized = String(value || "")
    .trim()
    .replace(/[^\w:.-]+/g, "-")
    .slice(0, 160);
  return ["__proto__", "prototype", "constructor"].includes(normalized) ? "" : normalized;
};

const createDerivedWorkKey = (work) => {
  const source = `${work?.type || "work"}:${work?.title || "untitled"}:${work?.url || ""}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return `work-${hash.toString(16)}`;
};

const projectAttachment = (attachment) => {
  if (!attachment || typeof attachment !== "object") return null;
  const url = safePublicUrl(attachment.url || attachment.src || attachment.href);
  if (!url) return null;
  return {
    name: String(attachment.name || "").slice(0, 160),
    type: String(attachment.type || "").slice(0, 100),
    size: Math.max(0, Number(attachment.size || 0)),
    url,
  };
};

const projectWork = (work) => {
  if (!work || typeof work !== "object" || !isPublished(work)) return null;
  const access = ["free", "metered", "member"].includes(work.access) ? work.access : "metered";
  const freePercent = access === "free"
    ? 100
    : Math.max(0, Math.min(100, Number(work.freePercent || 35)));
  const result = {
    id: String(work.id || work.sourceId || work.key || "").slice(0, 180),
    sourceId: String(work.sourceId || "").slice(0, 180),
    key: String(work.key || work.workKey || "").slice(0, 180),
    title: String(work.title || "").slice(0, 240),
    type: String(work.type || "note").slice(0, 40),
    author: safePublicAuthor(work.author),
    summary: String(work.summary || "").slice(0, 1000),
    url: safePublicUrl(work.url),
    original: work.original !== false,
    copyrightHash: String(work.copyrightHash || "").slice(0, 160),
    access,
    freePercent,
    status: "published",
    hidden: false,
    publishedAt: String(work.publishedAt || "").slice(0, 40),
    updatedAt: String(work.updatedAt || "").slice(0, 40),
    createdAt: String(work.createdAt || "").slice(0, 40),
  };

  if (access === "free") {
    result.body = String(work.body || "").slice(0, 500_000);
    result.bodyFormat = work.bodyFormat === "html" ? "html" : "text";
    result.audioUrl = safePublicUrl(work.audioUrl || work.mediaUrl || work.sourceUrl);
    result.attachments = Array.isArray(work.attachments)
      ? work.attachments.map(projectAttachment).filter(Boolean).slice(0, 20)
      : [];
  } else {
    result.body = "";
    result.bodyFormat = "text";
    result.audioUrl = "";
    result.attachments = [];
  }
  return result;
};

const projectProduct = (product) => {
  if (!product || typeof product !== "object" || !isPublished(product)) return null;
  const coverUrl = safePublicUrl(product.cover?.url || product.coverUrl || product.imageUrl);
  return {
    id: String(product.id || "").slice(0, 180),
    type: String(product.type || "ebook").slice(0, 40),
    title: String(product.title || "").slice(0, 240),
    description: String(product.description || product.summary || "").slice(0, 1200),
    visitorPrice: Math.max(0, Number(product.visitorPrice || 0)),
    memberPrice: Math.max(0, Number(product.memberPrice || 0)),
    coverUrl,
    status: "published",
    published: true,
    publishedAt: String(product.publishedAt || "").slice(0, 40),
  };
};

const projectProducts = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result = {};
  Object.entries(value).forEach(([slot, product]) => {
    if (slot === "extraProducts" && Array.isArray(product)) {
      result.extraProducts = product.map(projectProduct).filter(Boolean).slice(0, 20);
      return;
    }
    const projected = projectProduct(product);
    if (projected) result[String(slot).slice(0, 80)] = projected;
  });
  return result;
};

const projectContact = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.enabled !== true) {
    return { enabled: false, wechatId: "", wechatQr: null, whatsapp: "" };
  }
  const qrUrl = safePublicUrl(value.wechatQr?.url || value.wechatQr);
  return {
    enabled: true,
    wechatId: String(value.wechatId || "").slice(0, 120),
    wechatQr: qrUrl ? { url: qrUrl } : null,
    whatsapp: String(value.whatsapp || "").slice(0, 80),
  };
};

const projectViewCounts = (value, works) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const allowedKeys = new Set();
  works.forEach((work) => {
    [work.key, work.id, work.sourceId, createDerivedWorkKey(work)]
      .map(normalizeViewKey)
      .filter(Boolean)
      .forEach((key) => allowedKeys.add(key));
  });
  const result = Object.create(null);
  Object.entries(value).slice(0, 2000).forEach(([key, entry]) => {
    const normalizedKey = normalizeViewKey(key);
    if (!normalizedKey || !allowedKeys.has(normalizedKey)) return;
    const count = Math.max(0, Math.floor(Number(entry?.count || 0)));
    result[normalizedKey] = { count: Number.isFinite(count) ? count : 0 };
  });
  return result;
};

const projectPublicCatalog = (state) => {
  const works = (Array.isArray(readItemJson(state, "personal-site-works", []))
    ? readItemJson(state, "personal-site-works", [])
    : [])
    .map(projectWork)
    .filter(Boolean)
    .slice(0, 1000);
  return {
    works,
    products: projectProducts(readItemJson(state, "yiten-book-products", {})),
    contact: projectContact(readItemJson(state, "yiten-contact-config", {})),
    viewCounts: projectViewCounts(readItemJson(state, "yiten-work-views", {}), works),
    savedAt: state.savedAt || null,
  };
};

const serializePrivateState = (state) => {
  const items = {};
  const updatedAt = {};
  Object.entries(state.items || {}).forEach(([key, entry]) => {
    if (!isPrivateKey(key)) return;
    items[key] = String(entry?.value ?? "");
    updatedAt[key] = Number(entry?.updatedAt || 0);
  });
  return { items, updatedAt, savedAt: state.savedAt || null };
};

module.exports = {
  isPrivateKey,
  isPublished,
  isPublicKey,
  projectPublicCatalog,
  readState,
  serializePrivateState,
  writeState,
};
