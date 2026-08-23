// tests/security/rate-limit.test.js — 限流门禁(README Release gate #5)
const assert = require("node:assert/strict");
const { afterEach, beforeEach, test } = require("node:test");
const {
  adminRequestHeaders,
  clearProjectModules,
  configureTestAdmin,
  invoke,
  requireProject,
  resetSecurityEnv,
} = require("./helpers");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  resetSecurityEnv();
  configureTestAdmin();
  clearProjectModules();
});
afterEach(resetSecurityEnv);

test("rate limiter factory allows up to max and rejects beyond, then resets after the window", async () => {
  const { createRateLimiter } = requireProject("lib/rate-limit.js");
  const limiter = createRateLimiter({ windowMs: 120, max: 3 });
  for (let i = 1; i <= 3; i += 1) {
    const result = await limiter("unit-key");
    assert.equal(result.allowed, true, `request ${i} should be allowed`);
  }
  const blocked = await limiter("unit-key");
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds >= 1);
  await sleep(140);
  const afterReset = await limiter("unit-key");
  assert.equal(afterReset.allowed, true, "window reset should allow again");
});

test("login endpoint rate limits brute-force attempts per IP", async () => {
  const login = requireProject("api/auth.js");
  const headers = {
    host: "example.test",
    origin: "https://example.test",
    "x-forwarded-host": "example.test",
    "x-forwarded-proto": "https",
    "x-forwarded-for": "203.0.113.10",
  };
  let last = null;
  for (let i = 1; i <= 10; i += 1) {
    last = await invoke(login, { method: "POST", url: "/api/auth/login", headers, body: { password: "wrong-password" } });
    assert.equal(last.statusCode, 401, `attempt ${i} should be a plain 401`);
  }
  const blocked = await invoke(login, { method: "POST", url: "/api/auth/login", headers, body: { password: "wrong-password" } });
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.body.code, "rate_limited");
  assert.ok(Number(blocked.headers.get("retry-after")) >= 1);
  // A different IP is not affected.
  const other = await invoke(login, {
    method: "POST",
    url: "/api/auth/login",
    headers: { ...headers, "x-forwarded-for": "198.51.100.7" },
    body: { password: "wrong-password" },
  });
  assert.equal(other.statusCode, 401);
});

test("public catalog endpoint rate limits anonymous polling per IP", async () => {
  const catalog = requireProject("api/public/catalog.js");
  const headers = {
    host: "example.test",
    "x-forwarded-host": "example.test",
    "x-forwarded-proto": "https",
    "x-forwarded-for": "203.0.113.20",
  };
  for (let i = 1; i <= 60; i += 1) {
    const res = await invoke(catalog, { method: "GET", url: "/api/public/catalog", headers });
    assert.equal(res.statusCode, 200, `request ${i} should be allowed`);
  }
  const blocked = await invoke(catalog, { method: "GET", url: "/api/public/catalog", headers });
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.body.code, "rate_limited");
});

test("signing endpoint is rate limited even while disabled", async () => {
  // Rate limiting runs before credential checks, so 503s still consume quota.
  const sign = requireProject("api/ximalaya/jssdk-sign.js");
  const headers = {
    host: "example.test",
    origin: "https://example.test",
    "x-forwarded-host": "example.test",
    "x-forwarded-proto": "https",
    "x-forwarded-for": "203.0.113.30",
  };
  for (let i = 1; i <= 30; i += 1) {
    const res = await invoke(sign, { method: "POST", url: "/api/ximalaya/jssdk-sign", headers, body: {} });
    assert.equal(res.statusCode, 503, `request ${i} should hit disabled state`);
  }
  const blocked = await invoke(sign, { method: "POST", url: "/api/ximalaya/jssdk-sign", headers, body: {} });
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.body.code, "rate_limited");
});

test("wechat verification endpoint is rate limited while unconfigured", async () => {
  const wechat = requireProject("api/wechat/test-token.js");
  const headers = {
    host: "example.test",
    "x-forwarded-for": "203.0.113.50",
  };
  for (let i = 1; i <= 30; i += 1) {
    const res = await invoke(wechat, { method: "GET", url: "/api/wechat/test-token", headers });
    assert.equal(res.statusCode, 503, `request ${i} should hit unconfigured state`);
  }
  const blocked = await invoke(wechat, { method: "GET", url: "/api/wechat/test-token", headers });
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.body.code, "rate_limited");
});

test("view and upload limiters are wired into sync handler", async () => {
  const sync = requireProject("api/sync.js");
  const baseHeaders = adminRequestHeaders();
  baseHeaders["x-forwarded-for"] = "203.0.113.40";
  // Upload path: admin + blob configured, but bad payloads (415) still consume quota.
  process.env.BLOB_READ_WRITE_TOKEN = "test-blob-token";
  let uploadBlocked = null;
  for (let i = 1; i <= 21; i += 1) {
    const res = await invoke(sync, {
      method: "POST",
      url: "/api/sync/upload?fileName=x.mp3&folder=audio",
      headers: { ...baseHeaders, "content-type": "audio/mpeg" },
    });
    if (i <= 20) {
      assert.notEqual(res.statusCode, 429, `upload request ${i} should not be rate limited`);
    } else {
      uploadBlocked = res;
    }
  }
  assert.equal(uploadBlocked.statusCode, 429);
  assert.equal(uploadBlocked.body.code, "rate_limited");
});
