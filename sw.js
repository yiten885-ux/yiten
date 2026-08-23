const CACHE_PREFIX = "yiten-site-";
const CACHE_NAME = "yiten-site-v6-security";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/privacy.html",
  "/terms.html",
  "/cookies.html",
  "/robots.txt",
  "/sitemap.xml",
  "/assets/styles.css",
  "/assets/launch.css",
  "/assets/app.js",
  "/assets/i18n.js",
  "/assets/payments.js",
  "/assets/ximalaya.js",
  "/assets/smart-share.js",
  "/assets/install.js",
  "/manifest.webmanifest",
  "/public/ebook-cover.svg",
  "/public/hero-desk.svg",
];
const CACHEABLE_PATHS = new Set(STATIC_ASSETS);

const isSensitivePath = (pathname) =>
  pathname === "/api" ||
  pathname.startsWith("/api/") ||
  [
    "/admin",
    "/admin.html",
    "/owner",
    "/owner.html",
    "/creator",
    "/creator.html",
    "/manifest-owner.webmanifest",
  ].includes(pathname);

const responseCanBeCached = (response) => {
  if (!response || !response.ok || !["basic", "default"].includes(response.type)) return false;
  const cacheControl = String(response.headers.get("Cache-Control") || "").toLowerCase();
  if (/(?:^|,)\s*(?:no-store|private)(?:\s|,|$)/.test(cacheControl)) return false;
  return !response.headers.has("Set-Cookie");
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Sensitive routes are deliberately left to the network. They must never
  // read from or write to Cache API, and failures must remain failures.
  if (isSensitivePath(url.pathname)) return;
  if (request.mode === "navigate" && url.search) return;
  if (url.search || !CACHEABLE_PATHS.has(url.pathname)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!responseCanBeCached(response)) return response;
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
        return response;
      });
    })
  );
});
