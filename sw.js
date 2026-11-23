const CACHE = "sirib1-v1";
const CONTENT = Array.from({ length: 14 }, (_, i) => `./js/content/c${String(i + 1).padStart(2, "0")}.js`);
const ASSETS = [
  "./", "./index.html", "./manifest.json", "./css/style.css",
  "./js/app.js", "./js/data.js", "./js/store.js", "./js/speech.js", "./js/quiz.js", "./js/ui.js",
  "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png", ...CONTENT
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("sirib1-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Network first so updates arrive quickly; fall back to cache offline.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
  );
});
