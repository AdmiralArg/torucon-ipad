// Torucon iPad-loop: skalering, skjermbytte, meny, skjerm-lås og offline.
(function () {
  "use strict";

  var W = 2048, H = 2732;
  var STORE_KEY = "torucon-ipad-mode";
  var screens = Array.prototype.slice.call(document.querySelectorAll(".screen"));
  var menu = document.getElementById("menu");
  var mode = null;
  var current = -1;
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

  // ---- skjermbytte ----
  function show(index) {
    if (index === current) return;
    var prev = screens[current];
    if (prev) {
      prev.classList.remove("active");
      prev.classList.add("leaving");
      setTimeout(function () { prev.classList.remove("leaving"); }, 1300);
    }
    current = index;
    var s = screens[index];
    if (!prev) s.style.transition = "none"; // første skjerm vises med en gang
    s.classList.add("active");
    if (!prev) { void s.offsetWidth; s.style.transition = ""; }
  }

  function next() {
    show((current + 1) % screens.length);
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    if (mode !== "loop") return;
    var seconds = parseFloat(screens[current].dataset.seconds) || 20;
    timer = setTimeout(next, seconds * 1000);
  }

  function start(newMode) {
    mode = newMode;
    try { localStorage.setItem(STORE_KEY, mode); } catch (e) {}
    menu.hidden = true;
    clearTimeout(timer);
    if (mode === "loop") {
      current = -1;
      screens.forEach(function (s) { s.classList.remove("active"); });
      next();
    } else {
      var idx = screens.findIndex(function (s) { return s.dataset.id === mode; });
      show(idx < 0 ? 0 : idx);
    }
    keepAwake();
  }

  // ---- meny ----
  function openMenu() {
    clearTimeout(timer);
    menu.querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("current", b.dataset.mode === mode);
    });
    menu.hidden = false;
  }
  menu.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-mode]");
    if (b) start(b.dataset.mode);
  });

  // hold fingeren i 3 sekunder for å åpne menyen igjen
  var holdTimer = null;
  document.addEventListener("pointerdown", function () {
    if (!menu.hidden) return;
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
    if (document.visibilityState === "visible") { keepAwake(); schedule(); }
  });

  // ---- offline ----
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }

  // ---- oppstart ----
  var saved = null;
  try { saved = localStorage.getItem(STORE_KEY); } catch (e) {}
  if (saved) start(saved); else openMenu();
})();
