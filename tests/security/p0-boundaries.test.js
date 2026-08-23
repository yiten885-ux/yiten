const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { afterEach, beforeEach, test } = require("node:test");
const {
  clearProjectModules,
  configureTestAdmin,
  invoke,
  projectRoot,
  requireProject,
  resetSecurityEnv,
} = require("./helpers");

beforeEach(() => {
  resetSecurityEnv();
  configureTestAdmin();
  clearProjectModules();
});
afterEach(resetSecurityEnv);

test("internal upload and test-email endpoints require admin authentication", async () => {
  const originalFetch = global.fetch;
  let externalCalls = 0;
  global.fetch = async () => { externalCalls += 1; throw new Error("external call must not happen"); };
  try {
    const blobUpload = requireProject("api/blob-upload.js");
    const emailTest = requireProject("api/email/send-test.js");
    const blobResponse = await invoke(blobUpload, { method: "POST", url: "/api/blob-upload" });
    const emailResponse = await invoke(emailTest, { method: "POST", url: "/api/email/send-test" });
    assert.equal(blobResponse.statusCode, 401);
    assert.equal(emailResponse.statusCode, 401);
    assert.equal(externalCalls, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test("valid admin cookies cannot bypass same-origin checks", async () => {
  const originalFetch = global.fetch;
  let externalCalls = 0;
  global.fetch = async () => { externalCalls += 1; throw new Error("external call must not happen"); };
  try {
    const { adminRequestHeaders } = require("./helpers");
    const headers = { ...adminRequestHeaders(), origin: "https://attacker.test" };
    const cases = [
      [requireProject("api/blob-upload.js"), { method: "POST", url: "/api/blob-upload", headers }],
      [requireProject("api/email/send-test.js"), { method: "POST", url: "/api/email/send-test", headers, body: { to: "victim@example.test" } }],
    ];
    for (const [handler, request] of cases) {
      const response = await invoke(handler, request);
      assert.equal(response.statusCode, 403);
      assert.equal(response.body.code, "origin_forbidden");
    }
    assert.equal(externalCalls, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test("all payment and fulfillment endpoints fail closed without external calls", async () => {
  const originalFetch = global.fetch;
  let externalCalls = 0;
  global.fetch = async () => { externalCalls += 1; throw new Error("external call must not happen"); };
  try {
    process.env.STRIPE_SECRET_KEY = "synthetic-stripe-credential";
    process.env.PAYPAL_CLIENT_ID = "synthetic-paypal-client";
    process.env.PAYPAL_CLIENT_SECRET = "synthetic-paypal-secret";
    process.env.RESEND_API_KEY = "synthetic-email-credential";
    const cases = [
      ["api/payments.js", "POST", "/api/payments/create-checkout-session"],
      ["api/payments.js", "POST", "/api/payments/fulfill-checkout"],
      ["api/paypal.js", "POST", "/api/paypal/create-order"],
      ["api/paypal.js", "POST", "/api/paypal/capture-order"],
      ["api/paypal.js", "GET", "/api/paypal/client-config"],
    ];
    for (const [modulePath, method, url] of cases) {
      const response = await invoke(requireProject(modulePath), { method, url });
      assert.equal(response.statusCode, 503, modulePath);
      assert.equal(response.body.code, "payments_disabled_security_review", modulePath);
    }
    const replayableGet = await invoke(requireProject("api/payments.js"), {
      method: "GET",
      url: "/api/payments/fulfill-checkout?session_id=test",
    });
    assert.equal(replayableGet.statusCode, 405);
    assert.equal(externalCalls, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test("credential-backed integration endpoints are disabled or fail closed by default", async () => {
  delete process.env.WECHAT_TOKEN;
  const wechat = await invoke(requireProject("api/wechat/test-token.js"), {
    method: "GET",
    query: { signature: "0".repeat(40), timestamp: "1", nonce: "n", echostr: "test" },
  });
  assert.equal(wechat.statusCode, 503);

  const ximalaya = await invoke(requireProject("api/ximalaya/jssdk-sign.js"), {
    method: "POST",
    body: {},
  });
  assert.equal(ximalaya.statusCode, 503);
});

test("paid files are not public and creator client-side auth is fail-closed", () => {
  const privateArchive = path.join(projectRoot, "private-assets/yiten-toolkit.zip");
  assert.equal(fs.existsSync(path.join(projectRoot, "public/downloads/yiten-toolkit.zip")), false);
  const privateArchiveExists = fs.existsSync(privateArchive);
  const vercelIgnore = fs.readFileSync(path.join(projectRoot, ".vercelignore"), "utf8");
  const gitIgnore = fs.readFileSync(path.join(projectRoot, ".gitignore"), "utf8");
  assert.match(vercelIgnore, /^private-assets\/$/m);
  assert.match(gitIgnore, /^private-assets\/$/m);
  // The private archive is gitignored, so it is absent in CI checkouts by design.
  // When present locally, verify it is never duplicated anywhere public.
  const publicRoots = ["assets", "public"];
  const publicFiles = publicRoots.flatMap((root) => {
    const start = path.join(projectRoot, root);
    const files = [];
    const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(target);
      else files.push(target);
    });
    walk(start);
    return files;
  });
  if (privateArchiveExists) {
    const privateHash = crypto.createHash("sha256").update(fs.readFileSync(privateArchive)).digest("hex");
    const duplicateHashes = publicFiles.filter((file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex") === privateHash);
    assert.deepEqual(duplicateHashes, []);
  }

  const vercel = JSON.parse(fs.readFileSync(path.join(projectRoot, "vercel.json"), "utf8"));
  assert.doesNotMatch(JSON.stringify(vercel.builds), /private-assets/);
  assert.doesNotMatch(JSON.stringify(vercel.routes), /private-assets/);
  assert.equal(vercel.routes.some((route) => ["/(.*)", "/(.*)$", "/:path*"].includes(route.src)), false);

  const creator = fs.readFileSync(path.join(projectRoot, "creator.html"), "utf8");
  assert.match(creator, /data-sync-scope="disabled"/);
  assert.match(creator, /CREATOR_PORTAL_ENABLED = false/);
  assert.match(creator, /id="creator-verify"[^>]*hidden/);
  assert.match(creator, /id="creator-auth"[^>]*hidden/);

  const index = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
  const admin = fs.readFileSync(path.join(projectRoot, "admin.html"), "utf8");
  const owner = fs.readFileSync(path.join(projectRoot, "owner.html"), "utf8");
  assert.match(index, /data-sync-scope="public"/);
  assert.match(admin, /data-sync-scope="admin"/);
  assert.match(owner, /data-sync-scope="admin"/);
  assert.doesNotMatch(admin, /yiten-admin-unlocked/);
  for (const file of [...publicFiles, path.join(projectRoot, "index.html"), path.join(projectRoot, "manifest.webmanifest")]) {
    assert.doesNotMatch(fs.readFileSync(file, "utf8"), /private-assets|yiten-toolkit\.zip/);
  }
});

test("legacy private-state renderers escape HTML and executable URLs", () => {
  const admin = fs.readFileSync(path.join(projectRoot, "admin.html"), "utf8");
  const owner = fs.readFileSync(path.join(projectRoot, "owner.html"), "utf8");
  const publicApp = fs.readFileSync(path.join(projectRoot, "assets/app.js"), "utf8");
  const syncClient = fs.readFileSync(path.join(projectRoot, "assets/sync.js"), "utf8");
  const escapeBlock = admin.match(/const htmlEscapeMap = [\s\S]*?const escapeAttribute = [^\n]+;/)?.[0];
  const urlBlock = admin.match(/const safeAdminUrl = [\s\S]*?^      };/m)?.[0];
  assert.ok(escapeBlock);
  assert.ok(urlBlock);
  const context = { URL, location: { origin: "https://example.test" } };
  vm.runInNewContext(`${escapeBlock}\n${urlBlock}\nresult = { escapeHtml, escapeAttribute, safeAdminUrl };`, context);
  const payload = `"><img src=x onerror=globalThis.pwned=1>`;
  assert.equal(context.result.escapeHtml(payload), "&quot;&gt;&lt;img src=x onerror=globalThis.pwned=1&gt;");
  assert.equal(context.result.safeAdminUrl("javascript:alert(1)"), "");
  assert.equal(context.result.safeAdminUrl("https://attacker.test/creator.html", { sameOrigin: true }), "");
  assert.equal(context.result.safeAdminUrl("/creator.html?invite=safe", { sameOrigin: true }), "https://example.test/creator.html?invite=safe");
  assert.match(admin, /adminRichEditor\.innerHTML = sanitizeAdminHtml\(html\)/);
  assert.match(admin, /previewBody"\)\.innerHTML = sanitizeAdminHtml/);
  assert.match(admin, /escapeHtml\(invite\.email/);
  assert.match(admin, /safeAdminUrl\(invite\.inviteUrl, \{ sameOrigin: true \}\)/);
  assert.match(admin, /escapeHtml\(work\.title/);
  assert.match(admin, /escapeHtml\(item\.legalName/);
  assert.match(admin, /data-source-key="\$\{escapeAttribute\(item\.sourceKey\)\}"/);
  assert.match(admin, /escapeHtml\(item\.summary \|\| item\.description/);
  assert.match(admin, /safeQrUrl = safeAdminUrl/);
  assert.match(admin, /escapeHtml\(data\.payoutAccount/);
  assert.match(owner, /escapeHtml\(item\.visitorPrice/);
  assert.match(admin, /YitenSync\?\.stop\?\.\(\{ clearPrivate: true \}\)/);
  assert.match(owner, /YitenSync\?\.stop\?\.\(\{ clearPrivate: true \}\)/);

  const publicUrlBlock = publicApp.match(/const safePublicClientUrl = [\s\S]*?^};/m)?.[0];
  assert.ok(publicUrlBlock);
  const publicContext = { URL, location: { origin: "https://example.test" } };
  vm.runInNewContext(`${publicUrlBlock}\nresult = safePublicClientUrl;`, publicContext);
  assert.equal(publicContext.result("javascript:alert(1)"), "");
  assert.equal(publicContext.result("data:image/svg+xml,bad", { allowHash: false }), "");
  assert.equal(publicContext.result("//attacker.test/path"), "");
  assert.equal(publicContext.result("/safe/path"), "https://example.test/safe/path");
  assert.doesNotMatch(publicApp, /const legacyWorks\s*=/);
  assert.match(publicApp, /work\.published === true \|\| status === "published"/);
  assert.match(publicApp, /url: safePublicClientUrl\(work\.url\) \|\| "#works"/);
  assert.match(publicApp, /const enabled = cfg\.enabled === true/);
  assert.match(publicApp, /const src = safePublicClientUrl\(child\.getAttribute\("src"\), \{ allowHash: false \}\)/);
  assert.match(syncClient, /legacyPublicContentKeys/);
});

test("known hardcoded credential fallbacks and public paid-download paths are absent", () => {
  const authSource = fs.readFileSync(path.join(projectRoot, "lib/auth-shared.js"), "utf8");
  const wechatSource = fs.readFileSync(path.join(projectRoot, "api/wechat/test-token.js"), "utf8");
  const emailSource = fs.readFileSync(path.join(projectRoot, "lib/email-shared.js"), "utf8");
  assert.doesNotMatch(authSource, /fallbackPassword|getAllowedPasswords|ADMIN_PASSWORD\s*\|\|\s*["'][^"']/);
  assert.doesNotMatch(wechatSource, /WECHAT_TOKEN\s*\|\|/);
  assert.doesNotMatch(emailSource, /\/public\/downloads\/yiten-toolkit\.zip/);
});

test("protected-page inline security code parses after hardening", () => {
  for (const name of ["admin.html", "owner.html", "creator.html"]) {
    const html = fs.readFileSync(path.join(projectRoot, name), "utf8");
    const inlineScripts = Array.from(html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi))
      .map((match) => match[1].trim())
      .filter(Boolean);
    assert.ok(inlineScripts.length > 0, name);
    inlineScripts.forEach((source, index) => assert.doesNotThrow(
      () => new vm.Script(source, { filename: `${name}:inline-${index + 1}` }),
      name
    ));
  }
});
