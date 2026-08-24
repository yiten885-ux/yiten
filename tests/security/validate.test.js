// tests/security/validate.test.js — 校验层与 catalog 客户端样板测试
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { afterEach, beforeEach, test } = require("node:test");
const { clearProjectModules, projectRoot, requireProject, resetSecurityEnv } = require("./helpers");

beforeEach(() => {
  resetSecurityEnv();
  clearProjectModules();
});
afterEach(resetSecurityEnv);

test("validate: safeString truncates long values and neutralizes non-strings", () => {
  const v = requireProject("assets/validate.js");
  assert.equal(v.safeString("abc", 2), "ab");
  assert.equal(v.safeString(null, 5), "");
  assert.equal(v.safeString(42, 5), "42");
  assert.equal(v.safeString("x".repeat(1000), 10), "x".repeat(10));
});

test("validate: normalizeWork keeps only known keys and truncates", () => {
  const v = requireProject("assets/validate.js");
  const work = v.normalizeWork({
    id: "w1",
    title: "t".repeat(300),
    type: "note",
    summary: "s".repeat(600),
    evilField: "should-drop",
    tags: ["a", "b"],
    access: true,
  });
  assert.equal(work.id, "w1");
  assert.equal(work.title.length, 200);
  assert.equal(work.summary.length, 500);
  assert.equal(work.evilField, undefined);
  assert.deepEqual(work.tags, ["a", "b"]);
  assert.equal(v.normalizeWork("not-an-object"), null);
});

test("validate: catalogResponse guards contract and returns data as-is", () => {
  const v = requireProject("assets/validate.js");
  const payload = {
    ok: true,
    works: [{ id: "w1", title: "标题", unknownField: "kept" }],
    products: { book: {} },
    viewCounts: { w1: 3 },
    savedAt: "2026-08-22T15:18:41.083Z",
  };
  const result = v.catalogResponse(payload);
  // 契约通过:原样返回(服务端已净化,校验层不重写字段)
  assert.equal(result, payload);
  assert.equal(result.works[0].unknownField, "kept");

  assert.equal(v.catalogResponse(null), null);
  assert.equal(v.catalogResponse({ works: "not-array" }), null);
  assert.equal(v.catalogResponse({ ok: true, works: [1], products: {}, viewCounts: {}, savedAt: null }), null);
  assert.equal(v.catalogResponse({ ok: true, works: [], products: {}, viewCounts: {}, savedAt: 123 }), null);
});

test("validate: apiError builds the unified error shape", () => {
  const v = requireProject("assets/validate.js");
  const error = v.apiError("catalog_unavailable", "公开内容暂时不可用。", 503);
  assert.deepEqual(error, { ok: false, error: { code: "catalog_unavailable", message: "公开内容暂时不可用。" }, status: 503 });
});

test("catalog client: fetchCatalog normalizes a healthy response", async () => {
  const { clearProjectModules: reset, requireProject: req } = { clearProjectModules, requireProject };
  const catalog = req("assets/catalog.js");
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    async json() {
      return { ok: true, works: [{ id: "w1", title: "标题", junk: 1 }], products: {}, contact: {}, viewCounts: {}, savedAt: "2026-08-22T15:18:41.083Z" };
    },
  });
  try {
    const data = await catalog.fetchCatalog({ timeoutMs: 2000 });
    assert.equal(data.ok, true);
    assert.equal(data.works[0].junk, 1);
    assert.equal(data.works[0].title, "标题");
  } finally {
    global.fetch = originalFetch;
    reset();
  }
});

test("catalog client: non-ok response throws unified ApiError", async () => {
  const catalog = requireProject("assets/catalog.js");
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 503,
    async json() {
      return { ok: false, error: { code: "catalog_unavailable", message: "公开内容暂时不可用。" } };
    },
  });
  try {
    await assert.rejects(() => catalog.fetchCatalog({ timeoutMs: 2000 }), (error) => {
      assert.equal(error.code, "catalog_unavailable");
      assert.equal(error.ok, false);
      assert.equal(error.message, "公开内容暂时不可用。");
      return true;
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test("catalog client: malformed success payload throws bad_catalog_shape", async () => {
  const catalog = requireProject("assets/catalog.js");
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    async json() {
      return { ok: true, works: "not-an-array" };
    },
  });
  try {
    await assert.rejects(() => catalog.fetchCatalog({ timeoutMs: 2000 }), (error) => {
      assert.equal(error.code, "bad_catalog_shape");
      return true;
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test("catalog client: network failure maps to network_error", async () => {
  const catalog = requireProject("assets/catalog.js");
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new Error("boom");
  };
  try {
    await assert.rejects(() => catalog.fetchCatalog({ timeoutMs: 2000 }), (error) => {
      assert.equal(error.code, "network_error");
      return true;
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test("sync public scope uses the catalog client when available (vm integration)", async () => {
  const validate = requireProject("assets/validate.js");
  const catalogClient = requireProject("assets/catalog.js");
  const source = fs.readFileSync(path.join(projectRoot, "assets/sync.js"), "utf8");
  const calls = [];
  const fetchMock = async (url) => {
    calls.push(String(url));
    return {
      ok: true,
      status: 200,
      async json() {
        return { ok: true, works: [{ id: "w1", title: "标题", junk: 1 }], products: {}, contact: {}, viewCounts: {}, savedAt: "t" };
      },
    };
  };
  const window = {
    YitenCatalog: catalogClient,
    addEventListener() {},
    removeEventListener() {},
    clearInterval() {},
    clearTimeout() {},
    dispatchEvent() {},
    setInterval() { return 2; },
    setTimeout() { return 1; },
  };
  const document = {
    currentScript: { dataset: { syncScope: "public" } },
    hidden: false,
    addEventListener() {},
    removeEventListener() {},
  };
  const localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  const sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  const originalFetch = global.fetch;
  global.fetch = fetchMock;
  try {
    vm.runInNewContext(source, {
      AbortController,
      CustomEvent: function CustomEvent(type, init) { return { type, ...init }; },
      Date,
      Error,
      JSON,
      Map,
      Promise,
      Set,
      URLSearchParams,
      clearTimeout,
      console,
      document,
      fetch: fetchMock,
      localStorage,
      sessionStorage,
      setTimeout,
      window,
    });
    const sync = window.YitenSync;
    const result = await sync.pull();
    assert.equal(result.ok, true);
    // 通过统一客户端拉取,校验层原样透传已净化数据
    assert.equal(result.works[0].junk, 1);
    assert.equal(result.works[0].title, "标题");
  } finally {
    global.fetch = originalFetch;
  }
});
