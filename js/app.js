// Torucon iPad-loop: skalering, skjermbytte, lokale videoer, meny, skjerm-lås og offline.
(function () {
  "use strict";

  var W = 2048, H = 2732;
  var STORE_KEY = "torucon-ipad-mode";
  var screens = Array.prototype.slice.call(document.querySelectorAll(".screen"));
  var menu = document.getElementById("menu");
  var mode = null;
  var current = null;
  var timer = null;

  // ---- skalering: bakgrunn dekker hele skjermen, innhold får alltid plass ----
  function fit() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var root = document.documentElement.style;
    root.setProperty("--cover", Math.max(vw / W, vh / H));
    root.setProperty("--contain", Math.min(vw / W, vh / H));
  }
  window.addEventListener("resize", fit);
  window.addEventListener("orientationchange", function () { setTimeout(fit, 250); });
  fit();

  // ---- Bubble Pop: bobler som stiger ----
  document.querySelectorAll(".bubbles").forEach(function (box, n) {
    for (var i = 0; i < 14; i++) {
      var b = document.createElement("i");
      var size = 70 + Math.random() * 220;
      var t = 18 + Math.random() * 18;
      b.style.width = b.style.height = size + "px";
      b.style.left = (Math.random() * (W - size)) + "px";
      b.style.setProperty("--t", t + "s");
      b.style.setProperty("--delay", (-Math.random() * t) + "s");
      b.style.setProperty("--sway", ((Math.random() - 0.5) * 260) + "px");
      box.appendChild(b);
    }
  });

  // ---- Cyberdrive: rutenett, prikker og dekor-elementer fra Figma-animasjonen ----
  var cyber = document.querySelector(".screen.cyber");
  if (cyber) {
    var grid = cyber.querySelector(".cy-grid");
    for (var y = 0, i = 0; y <= H + 100; y += 98.2, i++) {
      var line = document.createElement("i");
      line.style.top = Math.round(y) + "px";
      line.className = "cy-line" + (i % 4);
      grid.appendChild(line);
    }
    var dots = cyber.querySelector(".cy-dots");
    var DOT_X = [0, 11.6, 23.2, 34.7, 46.3, 57.9, 69.5, 81.1, 92.6, 104.2];
    DOT_X.forEach(function (x, j) {
      // øverst til venstre, og speilet nederst til høyre
      [[113.6 + x, 80], [1934.4 - x - 3.05, 2352 - 3.05]].forEach(function (p) {
        var d = document.createElement("i");
        d.className = "cy-dot" + j;
        d.style.left = p[0] + "px";
        d.style.top = p[1] + "px";
        dots.appendChild(d);
      });
    });
    var deco = cyber.querySelector(".cy-deco");
    for (var k = 0; k < 21; k++) {
      var el = document.createElement("div");
      el.className = "cy cy" + k;
      deco.appendChild(el);
    }
  }

  // ---- videoer fra iPaden, lagret i IndexedDB så de overlever omstart og oppdateringer ----
  var screensEl = document.getElementById("screens");
  var videos = []; // { id, name, size, added, blob, url, section }
  var DB_NAME = "torucon-ipad", STORE = "videos", FILL_KEY = "torucon-ipad-video-fill";
  var dbPromise = null;

  function db() {
    if (!dbPromise) dbPromise = new Promise(function (resolve, reject) {
      var r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE, { keyPath: "id" }); };
      r.onsuccess = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
    });
    return dbPromise;
  }
  function tx(type, fn) {
    return db().then(function (d) {
      return new Promise(function (resolve, reject) {
        var t = d.transaction(STORE, type);
        var req = fn(t.objectStore(STORE));
        t.oncomplete = function () { resolve(req && req.result); };
        t.onerror = t.onabort = function () { reject(t.error); };
      });
    });
  }

  function addVideoSection(item) {
    item.url = URL.createObjectURL(item.blob);
    var s = document.createElement("section");
    s.className = "screen video";
    s.dataset.id = "video-" + item.id;
    var v = document.createElement("video");
    // iPaden spiller bare av automatisk når videoen er uten lyd og spilles inne i siden
    v.muted = true; v.defaultMuted = true; v.playsInline = true;
    v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("webkit-playsinline", "");
    v.setAttribute("disablepictureinpicture", ""); v.setAttribute("disableremoteplayback", "");
    v.preload = "auto";
    v.addEventListener("ended", function () { if (current === s && playlist.length > 1) next(); });
    v.addEventListener("loadedmetadata", function () { if (current === s) schedule(); });
    v.addEventListener("error", function () {
      // formatet kan ikke spilles: hopp videre i stedet for å bli stående på svart
      if (current === s && playlist.length > 1) { clearTimeout(timer); timer = setTimeout(next, 2000); }
    });
    s.appendChild(v);
    screensEl.appendChild(s);
    item.section = s;
  }

  function loadVideos() {
    return tx("readonly", function (st) { return st.getAll(); }).then(function (rows) {
      (rows || []).sort(function (a, b) { return a.added - b.added; }).forEach(function (item) {
        addVideoSection(item);
        videos.push(item);
      });
    });
  }

  function saveFiles(files) {
    var list = Array.prototype.slice.call(files);
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
    return list.reduce(function (chain, file, i) {
      return chain.then(function () {
        var item = { id: Date.now() + "-" + i, name: file.name || "Video", size: file.size, added: Date.now() + i, blob: file };
        return tx("readwrite", function (st) { return st.put(item); }).then(function () {
          addVideoSection(item);
          videos.push(item);
        });
      });
    }, Promise.resolve());
  }

  function removeVideo(id) {
    var item = videos.filter(function (v) { return v.id === id; })[0];
    if (!item) return Promise.resolve();
    return tx("readwrite", function (st) { return st["delete"](id); }).then(function () {
      videos.splice(videos.indexOf(item), 1);
      stopVideo(item.section);
      item.section.remove();
      URL.revokeObjectURL(item.url);
    });
  }

  function setFill(on) {
    document.body.classList.toggle("video-fill", on);
    try { localStorage.setItem(FILL_KEY, on ? "1" : ""); } catch (e) {}
  }

  function playVideo(s) {
    var v = s.querySelector("video");
    if (!v) return;
    var item = videos.filter(function (x) { return x.section === s; })[0];
    if (!item) return;
    v.loop = playlist.length === 1; // én video alene looper sømløst
    if (v.getAttribute("src") !== item.url) v.src = item.url;
    try { v.currentTime = 0; } catch (e) {}
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }

  function stopVideo(s) {
    var v = s && s.querySelector("video");
    if (!v || !v.getAttribute("src")) return;
    // slipp videoen helt, så iPaden ikke har mange videoer lastet samtidig
    v.pause();
    v.removeAttribute("src");
    v.load();
  }

  // ---- skjermbytte ----
  var playlist = [];
  var pos = -1;

  function show(s) {
    if (s === current) return;
    var prev = current;
    if (prev) {
      prev.classList.remove("active");
      prev.classList.add("leaving");
      setTimeout(function () {
        prev.classList.remove("leaving");
        if (prev !== current) stopVideo(prev);
      }, 1300);
    }
    current = s;
    if (!prev) s.style.transition = "none"; // første skjerm vises med en gang
    s.classList.add("active");
    if (!prev) { void s.offsetWidth; s.style.transition = ""; }
    playVideo(s);
  }

  function next() {
    pos = (pos + 1) % playlist.length;
    show(playlist[pos]);
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    if (playlist.length < 2 || !current) return;
    var seconds;
    var v = current.querySelector("video");
    if (v) {
      // videoen bytter selv når den er ferdig; dette er bare en vakthund hvis den henger seg opp
      seconds = isFinite(v.duration) && v.duration > 0 ? v.duration + 10 : 15 * 60;
    } else {
      seconds = parseFloat(current.dataset.seconds) || 20;
    }
    timer = setTimeout(next, seconds * 1000);
  }

  function buildPlaylist(m) {
    var vids = videos.map(function (v) { return v.section; });
    if (m === "loop") return screens.concat(vids);
    if (m === "videos") return vids;
    var match = screens.filter(function (s) { return s.dataset.id === m; });
    return match.length ? match : [screens[0]];
  }

  function start(newMode) {
    var list = buildPlaylist(newMode);
    if (!list.length) { openMenu(); return; }
    mode = newMode;
    try { localStorage.setItem(STORE_KEY, mode); } catch (e) {}
    menu.hidden = true;
    clearTimeout(timer);
    screens.concat(videos.map(function (v) { return v.section; })).forEach(function (s) {
      s.classList.remove("active", "leaving");
      stopVideo(s);
    });
    current = null;
    playlist = list;
    pos = -1;
    next();
    keepAwake();
  }

  // ---- meny ----
  var videoList = document.getElementById("video-list");
  var videoInput = document.getElementById("video-input");
  var videoStatus = document.getElementById("video-status");
  var fillToggle = document.getElementById("video-fill");

  function mb(bytes) { return bytes >= 1e9 ? (bytes / 1e9).toFixed(1) + " GB" : Math.max(1, Math.round(bytes / 1e6)) + " MB"; }

  function renderMenu() {
    menu.querySelectorAll("button[data-mode]").forEach(function (b) {
      b.classList.toggle("current", b.dataset.mode === mode);
    });
    menu.querySelector('[data-mode="videos"]').hidden = !videos.length;
    menu.querySelector('[data-mode="loop"] .count').textContent =
      videos.length ? " + " + videos.length + (videos.length === 1 ? " video" : " videoer") : "";
    videoList.innerHTML = "";
    videos.forEach(function (v) {
      var li = document.createElement("li");
      var name = document.createElement("span");
      name.className = "vname";
      name.textContent = v.name;
      var size = document.createElement("span");
      size.className = "vsize";
      size.textContent = mb(v.size || (v.blob && v.blob.size) || 0);
      var rm = document.createElement("button");
      rm.type = "button";
      rm.dataset.remove = v.id;
      rm.textContent = "Fjern";
      li.append(name, size, rm);
      videoList.appendChild(li);
    });
    videoList.hidden = !videos.length;
  }

  function openMenu() {
    clearTimeout(timer);
    if (current) {
      var v = current.querySelector("video");
      if (v) v.pause();
    }
    renderMenu();
    menu.hidden = false;
  }
  menu.addEventListener("click", function (e) {
    var rm = e.target.closest("button[data-remove]");
    if (rm) {
      removeVideo(rm.dataset.remove).then(function () {
        if (mode === "videos" && !videos.length) mode = null;
        renderMenu();
      });
      return;
    }
    var b = e.target.closest("button[data-mode]");
    if (b) start(b.dataset.mode);
  });

  videoInput.addEventListener("change", function () {
    var files = videoInput.files;
    if (!files || !files.length) return;
    videoStatus.textContent = "Lagrer " + (files.length === 1 ? "videoen" : files.length + " videoer") + " på iPaden …";
    saveFiles(files).then(function () {
      videoStatus.textContent = "";
    }).catch(function (err) {
      videoStatus.textContent = err && err.name === "QuotaExceededError"
        ? "Det er ikke nok plass på iPaden til denne videoen."
        : "Klarte ikke å lagre videoen.";
    }).then(function () {
      videoInput.value = "";
      renderMenu();
    });
  });

  fillToggle.addEventListener("change", function () { setFill(fillToggle.checked); });
  try { fillToggle.checked = localStorage.getItem(FILL_KEY) === "1"; } catch (e) {}
  setFill(fillToggle.checked);

  // hold fingeren i 3 sekunder for å åpne menyen igjen
  var holdTimer = null;
  document.addEventListener("pointerdown", function () {
    if (!menu.hidden) return;
    // hvis iPaden stoppet autoavspilling (f.eks. i strømsparing), starter et trykk videoen
    var v = current && current.querySelector("video");
    if (v && v.paused) v.play().catch(function () {});
    holdTimer = setTimeout(openMenu, 3000);
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) {
    document.addEventListener(ev, function () { clearTimeout(holdTimer); });
  });
  document.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  document.addEventListener("gesturestart", function (e) { e.preventDefault(); });

  // ---- hold skjermen våken ----
  var lock = null;
  function keepAwake() {
    if (!("wakeLock" in navigator) || lock || document.visibilityState !== "visible") return;
    navigator.wakeLock.request("screen").then(function (l) {
      lock = l;
      lock.addEventListener("release", function () { lock = null; });
    }).catch(function () {});
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible" || !menu.hidden) return;
    keepAwake();
    var v = current && current.querySelector("video");
    if (v && v.paused) v.play().catch(function () {});
    schedule();
  });

  // ---- offline og automatisk oppdatering ----
  if ("serviceWorker" in navigator) {
    var hadController = !!navigator.serviceWorker.controller;
    var reloading = false;
    // ny versjon tatt i bruk: last siden på nytt (ikke ved aller første installasjon)
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (!hadController || reloading) return;
      reloading = true;
      location.reload();
    });
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").then(function (reg) {
        // iPadene står på hele dagen, så se etter ny versjon hvert kvarter
        setInterval(function () { reg.update().catch(function () {}); }, 15 * 60 * 1000);
      }).catch(function () {});
    });
  }

  // ---- oppstart ----
  function boot() {
    var saved = null;
    try { saved = localStorage.getItem(STORE_KEY); } catch (e) {}
    if (saved) start(saved); else openMenu();
  }
  loadVideos().then(boot, boot);
})();
