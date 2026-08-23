const assert = require("node:assert/strict");
const { afterEach, beforeEach, test } = require("node:test");
const {
  clearProjectModules,
  configureTestAdmin,
  invoke,
  requireProject,
  resetSecurityEnv,
} = require("./helpers");

const sameOriginHeaders = {
  host: "example.test",
  origin: "https://example.test",
  "x-forwarded-host": "example.test",
  "x-forwarded-proto": "https",
};

beforeEach(() => {
  resetSecurityEnv();
  clearProjectModules();
});
afterEach(resetSecurityEnv);

test("admin login fails closed for every missing-secret combination", async () => {
  const login = requireProject("api/auth/login.js");
  const cases = [
    { adminPassword: "test-only-admin-password", authSecret: undefined },
    { adminPassword: undefined, authSecret: "test-only-auth-secret-with-at-least-thirty-two-characters" },
    { adminPassword: undefined, authSecret: undefined },
  ];
  for (const config of cases) {
    resetSecurityEnv();
    if (config.adminPassword) process.env.ADMIN_PASSWORD = config.adminPassword;
    if (config.authSecret) process.env.AUTH_SECRET = config.authSecret;
    const response = await invoke(login, {
      method: "POST",
      url: "/api/auth/login",
      headers: sameOriginHeaders,
      body: { password: config.adminPassword || "attacker-value" },
    });
    assert.equal(response.statusCode, 503);
    assert.equal(response.body.code, "auth_not_configured");
    assert.equal(response.getHeader("set-cookie"), undefined);
  }
});

test("admin login rejects bad origin and bad password", async () => {
  configureTestAdmin();
  const login = requireProject("api/auth/login.js");
  const crossOrigin = await invoke(login, {
    method: "POST",
    headers: { ...sameOriginHeaders, origin: "https://attacker.test" },
    body: { password: process.env.ADMIN_PASSWORD },
  });
  assert.equal(crossOrigin.statusCode, 403);

  const badPassword = await invoke(login, {
    method: "POST",
    headers: sameOriginHeaders,
    body: { password: "not-the-admin-password" },
  });
  assert.equal(badPassword.statusCode, 401);
  assert.equal(badPassword.getHeader("set-cookie"), undefined);
});

test("valid login issues a short-lived host-only secure cookie", async () => {
  configureTestAdmin();
  const login = requireProject("api/auth/login.js");
  const status = requireProject("api/auth/status.js");
  const response = await invoke(login, {
    method: "POST",
    headers: sameOriginHeaders,
    body: { password: process.env.ADMIN_PASSWORD },
  });
  assert.equal(response.statusCode, 200);
  const cookie = response.getHeader("set-cookie");
  assert.match(cookie, /^__Host-yiten_admin=/);
  assert.match(cookie, /; Path=\//);
  assert.match(cookie, /; HttpOnly/);
  assert.match(cookie, /; Secure/);
  assert.match(cookie, /; SameSite=Strict/);
  assert.match(cookie, /; Max-Age=43200/);
  assert.doesNotMatch(cookie, /Domain=/i);
  assert.match(response.getHeader("cache-control"), /no-store/);

  const statusResponse = await invoke(status, {
    method: "GET",
    headers: { cookie: cookie.split(";")[0] },
  });
  assert.equal(statusResponse.statusCode, 200);
  assert.equal(statusResponse.body.authenticated, true);
});

test("sessions reject tampering, future issuance, expiry and secret rotation", () => {
  configureTestAdmin();
  const auth = requireProject("lib/auth-shared.js");
  const now = Date.now();
  const token = auth.createSessionValue(now);
  assert.equal(auth.isValidSession(token, now), true);
  assert.equal(auth.isValidSession(`${token}x`, now), false);
  assert.equal(auth.isValidSession(auth.createSessionValue(now + 1), now), false);
  assert.equal(auth.isValidSession(token, now + auth.sessionMaxAgeSeconds * 1000), false);
  process.env.AUTH_SECRET = "rotated-test-only-auth-secret-with-at-least-thirty-two-characters";
  assert.equal(auth.isValidSession(token, now), false);
});

test("logout requires same origin and clears the secure cookie", async () => {
  configureTestAdmin();
  const logout = requireProject("api/auth/logout.js");
  const rejected = await invoke(logout, {
    method: "POST",
    headers: { ...sameOriginHeaders, origin: "https://attacker.test" },
  });
  assert.equal(rejected.statusCode, 403);

  const response = await invoke(logout, { method: "POST", headers: sameOriginHeaders });
  assert.equal(response.statusCode, 200);
  const cookie = response.getHeader("set-cookie");
  assert.match(cookie, /^__Host-yiten_admin=;/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Max-Age=0/);
});
