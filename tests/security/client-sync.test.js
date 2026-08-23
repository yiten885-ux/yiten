const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const { projectRoot } = require("./helpers");

const source = fs.readFileSync(path.join(projectRoot, "assets/sync.js"), "utf8");

const createStorage = () => {
  const values = new Map();
  return {
    get length() { return values.size; },
    getItem(key) { return values.has(String(key)) ? values.get(String(key)) : null; },
    key(index) { return Array.from(values.keys())[index] || null; },
    removeItem(key) { values.delete(String(key)); },
    setItem(key, value) { values.set(String(key), String(value)); },
  };
};

const createHarness = (scope, { publicPayload, adminPayload, adminStatus = 200, initialLocalStorage = {} } = {}) => {
  const requests = [];
  const localStorage = createStorage();
  Object.entries(initialLocalStorage).forEach(([key, value]) => localStorage.setItem(key, value));
  const sessionStorage = createStorage();
  const lifecycle = { intervalsCleared: 0, listenersRemoved: 0 };
  const document = {
    currentScript: { dataset: { syncScope: scope } },
    hidden: false,
    addEventListener() {},
    removeEventListener() { lifecycle.listenersRemoved += 1; },
  };
  const window = {
    addEventListener() {},
    removeEventListener() { lifecycle.listenersRemoved += 1; },
    clearInterval() { lifecycle.intervalsCleared += 1; },
    clearTimeout() {},
    dispatchEvent() {},
    setInterval() { return 2; },
    setTimeout() { return 1; },
  };
  const fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    const isPublic = String(url).includes("/api/public/catalog");
    return {
      ok: isPublic || adminStatus === 200,
      status: isPublic ? 200 : adminStatus,
      async json() {
        return isPublic
          ? publicPayload || { ok: true, works: [], products: {}, contact: {}, viewCounts: {}, savedAt: "public-version" }
          : adminPayload || { ok: adminStatus === 200, code: adminStatus === 401 ? "authentication_required" : undefined, items: {}, updatedAt: {}, savedAt: "private-version" };
      },
    };
  };
  vm.runInNewContext(source, {
    CustomEvent: function CustomEvent(type, init) { return { type, ...init }; },
    Date,
    Error,
    JSON,
    Map,
    Promise,
    Set,
    URLSearchParams,
    console,
    document,
    fetch,
    localStorage,
    sessionStorage,
    window,
  });
  return { lifecycle, localStorage, requests, sessionStorage, sync: window.YitenSync };
};

test("public sync only reads the public catalog and never pushes local changes", async () => {
  const harness = createHarness("public", {
    initialLocalStorage: {
      "yiten-published-works": "LEGACY-OWNER-CONTENT",
      "yiten-creator-published-works": "LEGACY-CREATOR-CONTENT",
    },
    publicPayload: {
      ok: true,
      works: [],
      products: {},
      contact: {},
      viewCounts: {},
      items: { "yiten-creator-accounts": "FORGED-PRIVATE-STATE" },
      subscribers: ["private@example.test"],
      savedAt: "public-version",
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.sync.mode, "public");
  assert.equal(harness.requests.length, 1);
  assert.match(harness.requests[0].url, /\/api\/public\/catalog/);
  assert.equal(harness.requests[0].options.credentials, "omit");
  assert.equal(harness.localStorage.getItem("yiten-creator-accounts"), null);
  assert.equal(harness.localStorage.getItem("personal-site-subscribers"), null);
  assert.equal(harness.localStorage.getItem("yiten-published-works"), null);
  assert.equal(harness.localStorage.getItem("yiten-creator-published-works"), null);

  harness.localStorage.setItem("personal-site-subscribers", "private-local-value");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.requests.length, 1);
});

test("expired admin sessions stop sync and clear current and legacy private browser state", async () => {
  const harness = createHarness("admin", { adminStatus: 401 });
  const privateValues = {
    "yiten-admin-draft": "draft",
    "yiten-creator-accounts": "accounts",
    "personal-site-subscribers": "subscribers",
    "personal-site-works": "works",
    "yiten-creator-kyc": "legacy-kyc",
    "yiten-published-works": "legacy-works",
    "unrelated-key": "keep-me",
  };
  Object.entries(privateValues).forEach(([key, value]) => harness.localStorage.setItem(key, value));
  ["yiten-creator-session", "yiten-creator-phone-code", "yiten-creator-reset-code"]
    .forEach((key) => harness.sessionStorage.setItem(key, "private-session"));

  const result = await harness.sync.start();
  assert.equal(result.code, "authentication_required");
  Object.keys(privateValues).filter((key) => key !== "unrelated-key")
    .forEach((key) => assert.equal(harness.localStorage.getItem(key), null, key));
  assert.equal(harness.localStorage.getItem("unrelated-key"), "keep-me");
  assert.equal(harness.localStorage.getItem("__yiten-sync-updated-at"), null);
  ["yiten-creator-session", "yiten-creator-phone-code", "yiten-creator-reset-code"]
    .forEach((key) => assert.equal(harness.sessionStorage.getItem(key), null, key));
  assert.equal(harness.lifecycle.intervalsCleared, 1);
  assert.equal(harness.lifecycle.listenersRemoved, 3);

  harness.localStorage.setItem("yiten-admin-draft", "after-expiry");
  const push = await harness.sync.pushPending();
  assert.equal(push.code, "admin_sync_not_started");
  assert.equal(harness.requests.length, 1);
});

test("admin sync remains dormant until started, then uses credentialed private state", async () => {
  const harness = createHarness("admin");
  assert.equal(harness.requests.length, 0);
  harness.localStorage.setItem("yiten-admin-draft", "before-auth");
  assert.equal(harness.requests.length, 0);

  await harness.sync.start();
  assert.equal(harness.requests.length, 1);
  assert.match(harness.requests[0].url, /\/api\/sync\/state/);
  assert.equal(harness.requests[0].options.credentials, "include");

  harness.localStorage.setItem("yiten-admin-draft", "after-auth");
  await harness.sync.pushPending();
  assert.equal(harness.requests.length, 2);
  assert.equal(harness.requests[1].options.method, "POST");
  assert.equal(harness.requests[1].options.credentials, "include");
});

test("disabled creator sync cannot read, write or upload", async () => {
  const harness = createHarness("disabled");
  assert.equal(harness.requests.length, 0);
  assert.equal((await harness.sync.start()).code, "sync_disabled");
  await assert.rejects(() => harness.sync.uploadFile({ name: "x.png", type: "image/png" }), /后台会话/);
  assert.equal(harness.requests.length, 0);
});
