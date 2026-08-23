const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const { projectRoot } = require("./helpers");

const source = fs.readFileSync(path.join(projectRoot, "sw.js"), "utf8");

const createHeaders = (values = {}) => {
  const normalized = Object.fromEntries(Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    get: (name) => normalized[String(name).toLowerCase()] || null,
    has: (name) => Object.hasOwn(normalized, String(name).toLowerCase()),
  };
};

const createResponse = ({ ok = true, status = 200, type = "basic", headers = {} } = {}) => ({
  ok,
  status,
  type,
  headers: createHeaders(headers),
  clone() { return this; },
});

const createHarness = ({ response = createResponse(), cached = null, cacheKeys = [] } = {}) => {
  const handlers = {};
  const calls = { addAll: [], deleted: [], fetch: [], match: [], put: [] };
  const cache = {
    async addAll(assets) { calls.addAll.push(...assets); },
    async put(request) { calls.put.push(request.url); },
  };
  const caches = {
    async open() { return cache; },
    async keys() { return cacheKeys; },
    async delete(key) { calls.deleted.push(key); return true; },
    async match(request) { calls.match.push(request.url); return cached; },
  };
  const self = {
    location: { origin: "https://example.test" },
    clients: { claim() {} },
    addEventListener(type, handler) { handlers[type] = handler; },
    skipWaiting() {},
  };
  const fetch = async (request) => {
    calls.fetch.push(request.url);
    return response;
  };
  vm.runInNewContext(source, { URL, Set, Promise, caches, console, fetch, self });
  return { calls, handlers };
};

const runLifecycle = async (handler) => {
  const waits = [];
  handler({ waitUntil(promise) { waits.push(Promise.resolve(promise)); } });
  await Promise.all(waits);
};

const runFetch = async (handler, url, { mode = "cors" } = {}) => {
  const waits = [];
  let responsePromise;
  handler({
    request: { method: "GET", mode, url },
    respondWith(promise) { responsePromise = Promise.resolve(promise); },
    waitUntil(promise) { waits.push(Promise.resolve(promise)); },
  });
  const result = responsePromise ? await responsePromise : undefined;
  await Promise.all(waits);
  return { intercepted: Boolean(responsePromise), result };
};

test("precache excludes every protected route and API", async () => {
  const { calls, handlers } = createHarness();
  await runLifecycle(handlers.install);
  const list = calls.addAll.join("\n");
  assert.doesNotMatch(list, /\/api(?:\/|$)/);
  assert.doesNotMatch(list, /\/(?:admin|owner|creator)(?:\.html)?/);
  assert.doesNotMatch(list, /manifest-owner/);
});

test("sensitive paths and sensitive navigation queries bypass Cache API", async () => {
  const { calls, handlers } = createHarness();
  const urls = [
    "https://example.test/api/auth/status",
    "https://example.test/api/sync/state?t=1",
    "https://example.test/admin.html",
    "https://example.test/owner",
    "https://example.test/creator.html?invite=x&email=x",
    "https://example.test/manifest-owner.webmanifest",
    "https://example.test/?payment=success&session_id=x",
  ];
  for (const url of urls) {
    const result = await runFetch(handlers.fetch, url, { mode: url.includes("/?") ? "navigate" : "cors" });
    assert.equal(result.intercepted, false, url);
  }
  assert.deepEqual(calls.match, []);
  assert.deepEqual(calls.put, []);
  assert.deepEqual(calls.fetch, []);
});

test("only allowlisted cacheable responses are stored", async () => {
  const cacheable = createHarness();
  const result = await runFetch(cacheable.handlers.fetch, "https://example.test/assets/app.js");
  assert.equal(result.intercepted, true);
  assert.deepEqual(cacheable.calls.put, ["https://example.test/assets/app.js"]);

  const noStore = createHarness({ response: createResponse({ headers: { "Cache-Control": "private, no-store" } }) });
  await runFetch(noStore.handlers.fetch, "https://example.test/assets/app.js");
  assert.deepEqual(noStore.calls.put, []);

  const setCookie = createHarness({ response: createResponse({ headers: { "Set-Cookie": "session=private" } }) });
  await runFetch(setCookie.handlers.fetch, "https://example.test/assets/app.js");
  assert.deepEqual(setCookie.calls.put, []);

  const serverError = createHarness({ response: createResponse({ ok: false, status: 500 }) });
  await runFetch(serverError.handlers.fetch, "https://example.test/assets/app.js");
  assert.deepEqual(serverError.calls.put, []);
});

test("activation deletes legacy site caches but preserves unrelated caches", async () => {
  const { calls, handlers } = createHarness({
    cacheKeys: ["yiten-site-v5", "yiten-site-v6-security", "another-app-cache"],
  });
  await runLifecycle(handlers.activate);
  assert.deepEqual(calls.deleted, ["yiten-site-v5"]);
});
