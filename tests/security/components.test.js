// tests/security/components.test.js — 组件化渲染层测试(纯函数)
const assert = require("node:assert/strict");
const { afterEach, beforeEach, test } = require("node:test");
const { clearProjectModules, requireProject, resetSecurityEnv } = require("./helpers");

beforeEach(() => {
  resetSecurityEnv();
  clearProjectModules();
});
afterEach(resetSecurityEnv);

test("components: escapeHtml neutralizes markup and quotes", () => {
  const c = requireProject("assets/components.js");
  assert.equal(c.escapeHtml(`<script>alert("x")</script>`), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  assert.equal(c.escapeHtml("a'b"), "a&#039;b");
  assert.equal(c.escapeHtml("plain"), "plain");
});

test("components: safePublicClientUrl rejects dangerous protocols and keeps safe ones", () => {
  const c = requireProject("assets/components.js");
  const origin = "https://yitenhuang.com";
  assert.equal(c.safePublicClientUrl("javascript:alert(1)", { origin }), "");
  assert.equal(c.safePublicClientUrl("data:text/html,<script>", { origin }), "");
  assert.equal(c.safePublicClientUrl("//attacker.example.test/x", { origin }), "");
  assert.equal(c.safePublicClientUrl("\\evil\\path", { origin }), "");
  assert.equal(c.safePublicClientUrl("#anchor", { origin }), "#anchor");
  assert.equal(c.safePublicClientUrl("https://example.test/file.pdf", { origin }), "https://example.test/file.pdf");
  assert.equal(c.safePublicClientUrl("/assets/ok.png", { origin }), `${origin}/assets/ok.png`);
});

test("components: shareRewardPanel renders state with escaping and fallback threshold", () => {
  const c = requireProject("assets/components.js");
  const copy = {
    title: "分享解锁",
    rulePrefix: "每",
    ruleSuffix: "次分享解锁一篇",
    sharedCount: "已分享",
    availableUnlocks: "可用解锁",
    times: "次",
    nowUnlockable: "现在可以解锁",
    waiting: "还差 3 次",
    unlockedPrefix: "已兑现解锁：",
  };
  const html = c.shareRewardPanel({
    state: { completedShares: 2, availableUnlocks: 1, unlockedWorks: {}, history: [], lastAutoUnlocked: null, updatedAt: "" },
    copy,
    threshold: 3,
  });
  assert.match(html, /已分享 2 次/);
  assert.match(html, /可用解锁 1 次/);
  assert.match(html, /现在可以解锁/);
  // 阈值缺省兜底
  const fallback = c.shareRewardPanel({ state: { completedShares: 0 }, copy: { ...copy, rulePrefix: "", ruleSuffix: "", title: "", sharedCount: "", availableUnlocks: "", times: "", nowUnlockable: "", waiting: "", unlockedPrefix: "" }, threshold: undefined });
  assert.match(fallback, /3/);
});

test("components: shareRewardPanel escapes hostile title (XSS guard)", () => {
  const c = requireProject("assets/components.js");
  const copy = {
    title: "</strong><img src=x onerror=alert(1)>",
    rulePrefix: "",
    ruleSuffix: "",
    sharedCount: "",
    availableUnlocks: "",
    times: "",
    nowUnlockable: "",
    waiting: "",
    unlockedPrefix: "",
  };
  const html = c.shareRewardPanel({ state: { lastAutoUnlocked: null }, copy, threshold: 3 });
  // 字面标签不得出现(转义后属性名仍含 onerror= 字样,但不再是可执行标签)
  assert.doesNotMatch(html, /<img\b/);
  assert.doesNotMatch(html, /<script\b/);
  assert.match(html, /&lt;\/strong&gt;/);
});

test("components: lastAutoUnlocked title is escaped in panel copy", () => {
  const c = requireProject("assets/components.js");
  const html = c.shareRewardPanel({
    state: { lastAutoUnlocked: { title: "<b>坏</b>标题" } },
    copy: { title: "", rulePrefix: "", ruleSuffix: "", sharedCount: "", availableUnlocks: "", times: "", nowUnlockable: "", waiting: "", unlockedPrefix: "已兑现：" },
    threshold: 3,
  });
  assert.match(html, /已兑现：&lt;b&gt;坏&lt;\/b&gt;标题/);
  assert.doesNotMatch(html, /<b>坏<\/b>/);
});

test("components: workCard renders cover, time under cover and safe content", () => {
  const c = requireProject("assets/components.js");
  const base = {
    work: { title: "标题", access: "free", freePercent: 100, id: "w1", url: "https://example.test/a", copyrightHash: "", original: true, attachments: [] },
    title: "标题",
    summary: "摘要",
    typeLabel: "札记",
    accessLabel: "免费",
    originalLabel: "原创",
    copyrightLabel: "版权指纹",
    publishedAt: "发布于 2026年8月16日",
    previewText: "试看",
    inlineBody: "",
    fallbackBody: "<p>正文</p>",
    audioSource: "",
    isAudioWork: false,
    missingAudioHint: "",
    unlockCopy: "",
    shareState: { availableUnlocks: 0 },
    rewardUnlocked: false,
    locked: false,
    index: 0,
    workKey: "k1",
    url: "https://example.test/a",
    coverUrl: "",
    shareLabels: { wechat: "微信", x: "X" },
    uiLabels: { readPreview: "读预览", readFull: "读全文", subscribeUnlock: "订阅解锁", shareAria: "分享", shareTextLabel: "文案", shareHint: "提示" },
  };
  const html = c.workCard(base);
  assert.match(html, /work-cover work-cover-text/);           // 文字封面兜底
  assert.match(html, /work-cover-title/);                      // 封面含标题
  assert.match(html, /class="work-time"/);                     // 时间在封面下方
  assert.match(html, /发布于 2026年8月16日/);
  assert.match(html, /读全文/);
  assert.match(html, /data-share="wechat"/);
  assert.doesNotMatch(html, /<script\b/);
});

test("components: workCard image cover and gated unlock row", () => {
  const c = requireProject("assets/components.js");
  const html = c.workCard({
    work: { title: "付费", access: "member", freePercent: 20, id: "w2", url: "https://example.test/p", copyrightHash: "abc", original: true, attachments: [] },
    title: "付费",
    summary: "s",
    typeLabel: "文章",
    accessLabel: "会员",
    originalLabel: "原创",
    copyrightLabel: "版权指纹",
    publishedAt: "",
    previewText: "pv",
    inlineBody: "",
    fallbackBody: "",
    audioSource: "",
    isAudioWork: false,
    missingAudioHint: "",
    unlockCopy: "分享 3 次解锁",
    shareState: { availableUnlocks: 2 },
    rewardUnlocked: false,
    locked: true,
    index: 1,
    workKey: "k2",
    url: "https://example.test/p",
    coverUrl: "https://example.test/cover.jpg",
    shareLabels: { native: "分享" },
    uiLabels: { readPreview: "读预览", readFull: "读全文", subscribeUnlock: "订阅解锁", shareAria: "分享", shareTextLabel: "文案", shareHint: "提示" },
  });
  assert.match(html, /<img src="https:\/\/example\.test\/cover\.jpg"/); // 图片封面
  assert.match(html, /class="work-card gated"/);
  assert.match(html, /data-unlock-work/);                              // 解锁按钮
  assert.doesNotMatch(html, /disabled/);                                // availableUnlocks=2,不禁用
  assert.match(html, /读预览/);
});

test("components: workCard rejects javascript cover url", () => {
  const c = requireProject("assets/components.js");
  const html = c.workCard({
    work: { title: "t", access: "free", freePercent: 100, id: "w3", url: "javascript:alert(1)", original: true, attachments: [] },
    title: "t", summary: "s", typeLabel: "札记", accessLabel: "免费", originalLabel: "原创", copyrightLabel: "",
    publishedAt: "", previewText: "", inlineBody: "", fallbackBody: "", audioSource: "", isAudioWork: false,
    missingAudioHint: "", unlockCopy: "", shareState: {}, rewardUnlocked: false, locked: false, index: 0, workKey: "k3",
    url: "javascript:alert(1)", coverUrl: "javascript:alert(1)",
    shareLabels: {}, uiLabels: { readPreview: "", readFull: "", subscribeUnlock: "", shareAria: "", shareTextLabel: "", shareHint: "" },
  });
  // coverUrl 是调用方用 safePublicClientUrl 净化后的结果;此处直接传危险值,组件不应输出 <img src="javascript:
  assert.doesNotMatch(html, /javascript:/);
});

test("components: bookProductData maps product to card data safely", () => {
  const c = requireProject("assets/components.js");
  const data = c.bookProductData({
    title: "《只富一次》电子书",
    description: "desc",
    includes: "现金流\n债务，应急金",
    files: [{ name: "ebook.pdf" }, { name: "ebook.pdf" }, { name: "audio.m4a" }],
    visitorPrice: 29.5,
    memberPrice: 19,
    cover: "https://example.test/cover.png",
  });
  assert.equal(data.title, "《只富一次》电子书");
  assert.deepEqual(data.points, ["现金流", "债务", "应急金"]);
  assert.deepEqual(data.formats, ["PDF", "M4A"]); // 去重 + 大写
  assert.equal(c.formatPrice(data.visitorPrice), "$29.50");
  assert.equal(c.formatPrice(data.memberPrice), "$19");
  assert.equal(data.cover, "https://example.test/cover.png");
});

test("components: bookProductData rejects dangerous cover and handles null", () => {
  const c = requireProject("assets/components.js");
  const data = c.bookProductData({ title: "t", cover: "javascript:alert(1)", coverUrl: "data:text/html,x", visitorPrice: "29" });
  assert.equal(data.cover, "");
  assert.equal(c.formatPrice(data.visitorPrice), "$29");
  assert.equal(c.bookProductData(null), null);
  assert.equal(c.bookProductData("x"), null);
  // 无 includes/files 时 points 为空、formats 为空
  const minimal = c.bookProductData({ title: "t" });
  assert.deepEqual(minimal.points, []);
  assert.deepEqual(minimal.formats, []);
});

test("components: diagnosticTools expose three complete tools", () => {
  const c = requireProject("assets/components.js");
  const tools = c.diagnosticTools;
  assert.deepEqual(Object.keys(tools).sort(), ["cashflow", "map", "windfall"]);
  for (const [name, tool] of Object.entries(tools)) {
    assert.equal(typeof tool.title, "string", `${name}.title`);
    assert.equal(typeof tool.copy, "string", `${name}.copy`);
    assert.ok(Array.isArray(tool.questions) && tool.questions.length >= 3, `${name}.questions`);
    assert.ok(tool.progress, `${name}.progress`);
  }
});

test("components: subscribeEmail validates, dedupes and persists", () => {
  const c = requireProject("assets/components.js");
  const storage = { data: new Map(), getItem(k) { return this.data.has(k) ? this.data.get(k) : null; }, setItem(k, v) { this.data.set(k, String(v)); } };
  const bad = c.subscribeEmail("not-an-email", { storage });
  assert.equal(bad.ok, false);
  assert.match(bad.message, /邮箱格式/);
  assert.equal(storage.data.size, 0, "invalid email must not persist");

  const first = c.subscribeEmail("Reader@Example.com ", { storage });
  assert.equal(first.ok, true);
  const saved = JSON.parse(storage.data.get("personal-site-subscribers"));
  assert.deepEqual(saved, ["reader@example.com"], "normalized and lowercased");

  const second = c.subscribeEmail("reader@example.com", { storage });
  assert.equal(second.subscribed, false, "duplicate must not be appended");
  assert.equal(JSON.parse(storage.data.get("personal-site-subscribers")).length, 1);

  const noStorage = c.subscribeEmail("a@b.co", {});
  assert.equal(noStorage.ok, true, "validation-only mode");
});

test("components: noteTimeline lists notes newest-first with anchors", () => {
  const c = requireProject("assets/components.js");
  const html = c.noteTimeline([
    { id: "n1", title: "第一条", type: "note", publishedAt: "2026-08-16T10:00:00Z" },
    { id: "n2", title: "第二条", type: "note", publishedAt: "2026-08-18T10:00:00Z" },
    { id: "e1", title: "文章不算", type: "essay", publishedAt: "2026-08-20T10:00:00Z" },
    { id: "n3", title: "无日期不算", type: "note" },
  ]);
  const order = [...html.matchAll(/<a href="#([^"]+)">/g)].map((m) => m[1]);
  assert.deepEqual(order, ["n2", "n1"], "newest first, only notes with dates");
  assert.match(html, /2026-08-18/);
  assert.match(html, />第二条</);
  assert.doesNotMatch(html, /文章不算/);
  assert.doesNotMatch(html, /无日期不算/);
  assert.equal(c.noteTimeline([]), "");
  assert.equal(c.noteTimeline(null), "");
});
