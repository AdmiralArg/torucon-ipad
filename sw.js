// Lagrer alt på iPaden ved første besøk, så loopen kjører uten nett.
// Bump VERSION når noe endres, så iPadene henter ny versjon neste gang de er på nett.
var VERSION = "torucon-ipad-v4";
var FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/app.css",
  "css/cyber.css",
  "js/app.js",
  "assets/fonts/fonts.css",
  "assets/fonts/DelaGothicOne-400-latin.woff2",
  "assets/fonts/DelaGothicOne-400-latin-ext.woff2",
  "assets/fonts/Outfit-700-latin.woff2",
  "assets/fonts/Outfit-700-latin-ext.woff2",
  "assets/fonts/Outfit-900-latin.woff2",
  "assets/fonts/Outfit-900-latin-ext.woff2",
  "assets/fonts/Rajdhani-700-latin.woff2",
  "assets/fonts/Rajdhani-700-latin-ext.woff2",
  "assets/fonts/GeistMono-600-latin.woff2",
  "assets/fonts/GeistMono-600-latin-ext.woff2",
  "assets/img/bg-bubble.png",
  "assets/img/torucon-logo.svg",
  "assets/img/qr-programsoknad.svg",
  "assets/img/tote.png",
  "assets/img/pin.png",
  "assets/img/patch.png",
  "assets/img/vifte.png",
  "assets/img/cyber-logo.png",
  "assets/img/chevrons-left.png",
  "assets/img/chevrons-right.png",
  "assets/img/panel-left.png",
  "assets/img/panel-right.png",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", function (e) {
  // cache: "reload" så vi ikke lagrer gamle filer fra nettleserens vanlige cache
  var fresh = FILES.map(function (f) { return new Request(f, { cache: "reload" }); });
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(fresh); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(e.request);
  }));
});
