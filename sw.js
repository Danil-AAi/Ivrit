// Меняй номер версии при каждом обновлении файлов, чтобы iPhone подхватил новую версию.
const VERSION = "ivrit-v1";
const FILES = ["./", "./index.html", "./manifest.json", "./icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== "fonts").map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  // Шрифты Google: берём из кэша, в фоне обновляем
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open("fonts").then(async c => {
      const hit = await c.match(e.request);
      const net = fetch(e.request).then(r => { c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  // Файлы приложения: сначала сеть (чтобы видеть обновления), без сети — кэш
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(e.request)
        .then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; })
        .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("./index.html")))
    );
  }
});
