// Offline support: precache the app shell and data; serve from cache, refresh pages from the network.
const VERSION = "8ab46b8cc14c";
const CACHE = `jk-${VERSION}`;
const ASSETS = [
  "./",
  "data/age_groups_2025.csv",
  "data/age_rates.csv",
  "data/by_type.csv",
  "data/detail_causes.csv",
  "data/explorer.csv",
  "data/home_type.csv",
  "data/long_run.csv",
  "data/place.csv",
  "data/traffic_mode.csv",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/icon.svg",
  "index.html",
  "js/charts.js",
  "js/data.js",
  "js/explorer.js",
  "js/i18n.js",
  "js/main.js",
  "js/report.js",
  "js/share.js",
  "manifest.webmanifest",
  "styles.css",
  "vendor/d3.v7.9.0.min.js"
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('jk-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // Network first for the page, so a new version shows when online.
    event.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./', copy)); return res; })
        .catch(() => caches.match('./', { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))),
    );
    return;
  }
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })),
  );
});
