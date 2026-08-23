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

beforeEach(() => {
  resetSecurityEnv();
  configureTestAdmin();
  clearProjectModules();
});
afterEach(resetSecurityEnv);

test("private state rejects anonymous reads and writes before touching data", async () => {
  const sync = requireProject("api/sync.js");
  const headers = adminRequestHeaders();
  const seed = await invoke(sync, {
    method: "POST",
    url: "/api/sync/state?target=state",
    headers,
    body: { items: { "yiten-admin-draft": "PRIVATE-SEED" } },
  });
  assert.equal(seed.statusCode, 200);

  const read = await invoke(sync, { method: "GET", url: "/api/sync/state?target=state" });
  assert.equal(read.statusCode, 401);
  assert.equal(read.body.code, "authentication_required");
  ["items", "updatedAt", "savedAt", "configured"].forEach((key) => assert.equal(read.body[key], undefined));
  assert.doesNotMatch(JSON.stringify(read.body), /PRIVATE-SEED/);

  const tamperedHeaders = { ...headers, cookie: `${headers.cookie}tampered` };
  const tampered = await invoke(sync, { method: "GET", url: "/api/sync/state?target=state", headers: tamperedHeaders });
  assert.equal(tampered.statusCode, 401);

  const write = await invoke(sync, {
    method: "POST",
    url: "/api/sync/state?target=state",
    body: { items: { "yiten-creator-accounts": "private-sentinel" } },
  });
  assert.equal(write.statusCode, 401);

  const after = await invoke(sync, { method: "GET", url: "/api/sync/state?target=state", headers });
  assert.equal(after.statusCode, 200);
  assert.equal(after.body.items["yiten-admin-draft"], "PRIVATE-SEED");
  assert.equal(after.body.items["yiten-creator-accounts"], undefined);
});

test("authenticated cross-origin state and upload mutations are rejected", async () => {
  const sync = requireProject("api/sync.js");
  const headers = { ...adminRequestHeaders(), origin: "https://attacker.test" };
  const state = await invoke(sync, {
    method: "POST",
    url: "/api/sync/state?target=state",
    headers,
    body: { items: { "yiten-admin-draft": "CROSS-ORIGIN-WRITE" } },
  });
  assert.equal(state.statusCode, 403);

  const upload = await invoke(sync, {
    method: "POST",
    url: "/api/sync/upload?target=upload&folder=images&fileName=x.png",
    headers: { ...headers, "content-type": "image/png" },
  });
  assert.equal(upload.statusCode, 403);

  const read = await invoke(sync, {
    method: "GET",
    url: "/api/sync/state?target=state",
    headers: adminRequestHeaders(),
  });
  assert.equal(read.body.items["yiten-admin-draft"], undefined);
});

test("admin state uses server timestamps and rejects unknown keys", async () => {
  const sync = requireProject("api/sync.js");
  const headers = adminRequestHeaders();
  const before = Date.now();
  const write = await invoke(sync, {
    method: "POST",
    url: "/api/sync/state?target=state",
    headers,
    body: {
      items: { "yiten-admin-draft": "draft-sentinel" },
      updatedAt: { "yiten-admin-draft": Number.MAX_SAFE_INTEGER },
    },
  });
  assert.equal(write.statusCode, 200);

  const read = await invoke(sync, { method: "GET", url: "/api/sync/state?target=state", headers });
  assert.equal(read.statusCode, 200);
  assert.equal(read.body.items["yiten-admin-draft"], "draft-sentinel");
  assert.ok(read.body.updatedAt["yiten-admin-draft"] >= before);
  assert.ok(read.body.updatedAt["yiten-admin-draft"] < Number.MAX_SAFE_INTEGER);

  const unknown = await invoke(sync, {
    method: "POST",
    url: "/api/sync/state?target=state",
    headers,
    body: { items: { "attacker-controlled-key": "value" } },
  });
  assert.equal(unknown.statusCode, 400);
});

test("public catalog is a read-only projection with no private state", async () => {
  const sync = requireProject("api/sync.js");
  const catalog = requireProject("api/public/catalog.js");
  const headers = adminRequestHeaders();
  const privateSentinels = [
    "PRIVATE-ACCOUNT-SENTINEL",
    "PRIVATE-PROFILE-REVIEW-SENTINEL",
    "PRIVATE-CONTENT-REVIEW-SENTINEL",
    "PRIVATE-INVITE-SENTINEL",
    "PRIVATE-REVIEW-TIME-SENTINEL",
    "PRIVATE-SUBSCRIBER-SENTINEL",
    "PRIVATE-REWARD-SENTINEL",
    "PRIVATE-OFFER-SENTINEL",
    "PRIVATE-DRAFT-SENTINEL",
    "PRIVATE-CREATOR-WORK-SENTINEL",
    "PRIVATE-CREATOR-BOOK-SENTINEL",
    "PRIVATE-CREATOR-OFFER-SENTINEL",
  ];
  const restrictedTail = "RESTRICTED-BODY-SENTINEL";
  const works = [
    { id: "free-1", title: "Free", status: "published", access: "free", body: "public body", url: "https://example.test/free", attachments: [{ name: "bad", url: "javascript:alert(1)" }, { name: "good", url: "https://example.test/file.pdf" }] },
    { id: "paid-1", key: "public-key", title: "Paid", author: "private-author@example.test", status: "published", access: "member", body: restrictedTail, audioUrl: "data:audio/mp3;base64,AA==", attachments: [{ name: restrictedTail, url: "https://example.test/private.pdf" }], url: "//attacker.example.test/redirect" },
    { id: "implicit-1", title: "Implicit", access: "free", body: "IMPLICIT-WORK-SENTINEL" },
    { id: "draft-1", title: "Draft", status: "draft", body: "DRAFT-SENTINEL" },
  ];
  const products = {
    bundle: { id: "bundle", title: "Bundle", status: "published", visitorPrice: 59, coverUrl: "javascript:alert(1)", downloadUrl: "https://private.test/file" },
    implicit: { id: "implicit", title: "Implicit product", description: "IMPLICIT-PRODUCT-SENTINEL" },
    draft: { id: "draft", title: "Draft product", status: "draft" },
  };
  const privateItems = {
    "yiten-creator-accounts": privateSentinels[0],
    "yiten-creator-review-queue": privateSentinels[1],
    "yiten-creator-content-review-queue": privateSentinels[2],
    "yiten-creator-invites": privateSentinels[3],
    "yiten-review-updated-at": privateSentinels[4],
    "personal-site-subscribers": privateSentinels[5],
    "yiten-share-rewards-v1": privateSentinels[6],
    "yiten-offer": privateSentinels[7],
    "yiten-admin-draft": privateSentinels[8],
    "yiten-creator-work:private@example.test": privateSentinels[9],
    "yiten-creator-books:private@example.test": privateSentinels[10],
    "yiten-creator-offers:private@example.test": privateSentinels[11],
  };
  const write = await invoke(sync, {
    method: "POST",
    url: "/api/sync/state?target=state",
    headers,
    body: { items: {
      ...privateItems,
      "personal-site-works": JSON.stringify(works),
      "yiten-book-products": JSON.stringify(products),
      "yiten-contact-config": JSON.stringify({ enabled: true, wechatId: "public-contact", wechatQr: { url: "data:image/svg+xml,bad" }, payoutAccount: privateSentinels[0] }),
      "yiten-work-views": JSON.stringify({
        "public-key": { count: 7, lastViewedAt: "PRIVATE-VIEW-TIME-SENTINEL" },
        "draft-1": { count: 99, lastViewedAt: "PRIVATE-DRAFT-VIEW-SENTINEL" },
      }),
    } },
  });
  assert.equal(write.statusCode, 200);

  const response = await invoke(catalog, { method: "GET", url: "/api/public/catalog" });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.items, undefined);
  assert.equal(response.body.updatedAt, undefined);
  assert.deepEqual(response.body.works.map((work) => work.id), ["free-1", "paid-1"]);
  assert.deepEqual(Object.keys(response.body.works[0]).sort(), ["access", "attachments", "audioUrl", "author", "body", "bodyFormat", "copyrightHash", "createdAt", "freePercent", "hidden", "id", "key", "original", "publishedAt", "sourceId", "status", "summary", "title", "type", "updatedAt", "url"].sort());
  assert.equal(response.body.works[0].attachments.length, 1);
  assert.equal(response.body.works[1].body, "");
  assert.equal(response.body.works[1].audioUrl, "");
  assert.deepEqual(response.body.works[1].attachments, []);
  assert.equal(response.body.works[1].url, "");
  assert.equal(response.body.works[1].author, "");
  assert.deepEqual(Object.keys(response.body.products.bundle).sort(), ["coverUrl", "description", "id", "memberPrice", "published", "publishedAt", "status", "title", "type", "visitorPrice"].sort());
  assert.equal(response.body.products.bundle.coverUrl, "");
  assert.equal(response.body.products.bundle.downloadUrl, undefined);
  assert.equal(response.body.products.implicit, undefined);
  assert.equal(response.body.products.draft, undefined);
  assert.deepEqual(Object.keys(response.body.contact).sort(), ["enabled", "wechatId", "wechatQr", "whatsapp"].sort());
  assert.equal(response.body.contact.wechatQr, null);
  assert.deepEqual(Object.keys(response.body.viewCounts), ["public-key"]);
  assert.deepEqual(response.body.viewCounts["public-key"], { count: 7 });
  const serialized = JSON.stringify(response.body);
  privateSentinels.forEach((sentinel) => assert.doesNotMatch(serialized, new RegExp(sentinel)));
  assert.doesNotMatch(serialized, new RegExp(restrictedTail));
  assert.doesNotMatch(serialized, /IMPLICIT-(?:WORK|PRODUCT)-SENTINEL/);
  assert.doesNotMatch(serialized, /PRIVATE-(?:VIEW|DRAFT-VIEW)-TIME-SENTINEL/);

  const disableContact = await invoke(sync, {
    method: "POST",
    url: "/api/sync/state?target=state",
    headers,
    body: { items: { "yiten-contact-config": JSON.stringify({ wechatId: "MISSING-OPT-IN-SENTINEL" }) } },
  });
  assert.equal(disableContact.statusCode, 200);
  const disabledContactResponse = await invoke(catalog, { method: "GET", url: "/api/public/catalog" });
  assert.deepEqual(disabledContactResponse.body.contact, { enabled: false, wechatId: "", wechatQr: null, whatsapp: "" });
  assert.doesNotMatch(JSON.stringify(disabledContactResponse.body), /MISSING-OPT-IN-SENTINEL/);

  const post = await invoke(catalog, { method: "POST", url: "/api/public/catalog" });
  assert.equal(post.statusCode, 405);
});

test("upload is admin-only and public view writes are disabled by default", async () => {
  const sync = requireProject("api/sync.js");
  const upload = await invoke(sync, { method: "POST", url: "/api/sync/upload?target=upload" });
  assert.equal(upload.statusCode, 401);

  const view = await invoke(sync, {
    method: "POST",
    url: "/api/sync/view?target=view",
    body: { workKey: "anything" },
  });
  assert.equal(view.statusCode, 503);
  assert.equal(view.body.code, "view_tracking_disabled");
});
