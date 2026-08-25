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
