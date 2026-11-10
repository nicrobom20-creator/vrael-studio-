(function(){
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var y = document.getElementById("year"); if (y) y.textContent = new Date().getFullYear();

  /* ---- шапка ---- */
  var nav = document.getElementById("nav");
  function onNav(){ nav.classList.toggle("scrolled", window.scrollY > 40); }
  onNav();

  /* ---- манифест: разбиваем на слова ---- */
  var mt = document.querySelector("[data-words]");
  var words = [];
  if (mt) {
    var parts = mt.innerHTML.split(/(\s+)/);
    mt.innerHTML = parts.map(function(p){ return /^\s+$/.test(p) ? p : '<span class="w">' + p + "</span>"; }).join("");
    words = Array.prototype.slice.call(mt.querySelectorAll(".w"));
    if (reduce) words.forEach(function(w){ w.classList.add("on"); });
  }

  /* ---- появление при скролле ---- */
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }) : null;
  document.querySelectorAll(".reveal").forEach(function(el){ io ? io.observe(el) : el.classList.add("in"); });

  /* ---- чат в телефоне: сообщения по очереди ---- */
  var chat = document.getElementById("tgChat");
  var notice = document.querySelector(".notice");
  if (chat) {
    var items = Array.prototype.slice.call(chat.children);
    var played = false;
    var play = function(){
      if (played) return; played = true;
      items.forEach(function(it, i){ setTimeout(function(){ it.classList.add("show"); }, reduce ? 0 : 250 + i * 520); });
      if (notice) setTimeout(function(){ notice.classList.add("show"); }, reduce ? 0 : 250 + items.length * 520 + 300);
    };
    if (io) {
      new IntersectionObserver(function(en, o){ if (en[0].isIntersecting){ play(); o.disconnect(); } }, { threshold: 0.3 }).observe(chat);
    } else play();
  }

  /* ---- скролл-эффекты: слова, линия процесса, параллакс ---- */
  var fill = document.getElementById("trackFill"), track = document.getElementById("track");
  var par = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
  var ticking = false;
  function onScroll(){
    onNav();
    var vh = window.innerHeight;
    if (!reduce && words.length) {
      var r = mt.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      var n = Math.round(p * words.length);
      for (var i = 0; i < words.length; i++) words[i].classList.toggle("on", i < n);
    }
    if (!reduce && fill && track) {
      var tr = track.getBoundingClientRect();
      var tp = Math.min(1, Math.max(0, (vh * 0.9 - tr.top) / (vh * 0.6)));
      fill.style.transform = "scaleX(" + tp.toFixed(3) + ")";
    }
    var small = window.innerWidth < 820;
    par.forEach(function(el){
      if (reduce || small) { el.style.translate = ""; return; }
      var b = el.getBoundingClientRect();
      var off = (b.top + b.height / 2 - vh / 2) * parseFloat(el.dataset.parallax || 0);
      el.style.translate = "0 " + (-off).toFixed(1) + "px";
    });
    ticking = false;
  }
  window.addEventListener("scroll", function(){ if (!ticking){ ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---- hero: медленные «шёлковые» линии света на canvas ---- */
  var cv = document.getElementById("heroCanvas");
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext("2d");
  var W = 0, H = 0, dpr = 1, visible = true, t0 = performance.now();
  function size(){
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  var LINES = 46;
  function frame(now){
    var t = (now - t0) / 1000;
    ctx.fillStyle = "#0c0c0b"; ctx.fillRect(0, 0, W, H);
    // тёплое свечение
    var g = ctx.createRadialGradient(W * 0.68, H * 0.42, 0, W * 0.68, H * 0.42, Math.max(W, H) * 0.7);
    g.addColorStop(0, "rgba(130,112,86,0.36)"); g.addColorStop(0.45, "rgba(60,52,42,0.12)"); g.addColorStop(1, "rgba(12,12,11,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var mob = W < 700;
    var step = mob ? 14 : 10;
    for (var k = 0; k < LINES; k++) {
      var f = k / (LINES - 1);
      var base = H * (0.18 + f * 0.62);
      var amp = H * (0.07 + 0.05 * Math.sin(f * 3.1 + t * 0.07));
      // яркость: «блик» в середине пучка
      var hl = Math.exp(-Math.pow((f - 0.5 - 0.12 * Math.sin(t * 0.11)) / 0.16, 2));
      var a = 0.06 + 0.5 * hl;
      ctx.beginPath();
      for (var x = -20; x <= W + 20; x += step) {
        var u = x / W;
        var yv = base
          + Math.sin(u * 2.2 + t * 0.12 + f * 1.4) * amp
          + Math.sin(u * 5.1 - t * 0.09 + f * 2.6) * amp * 0.28
          - Math.pow(u - 0.7, 2) * H * 0.35 * (f - 0.3);
        x === -20 ? ctx.moveTo(x, yv) : ctx.lineTo(x, yv);
      }
      var lg = ctx.createLinearGradient(0, 0, W, 0);
      lg.addColorStop(0, "rgba(212,196,168,0)");
      lg.addColorStop(mob ? 0.2 : 0.35, "rgba(212,196,168," + (a * 0.5).toFixed(3) + ")");
      lg.addColorStop(0.72, "rgba(236,226,206," + a.toFixed(3) + ")");
      lg.addColorStop(1, "rgba(212,196,168," + (a * 0.3).toFixed(3) + ")");
      ctx.strokeStyle = lg; ctx.lineWidth = hl > 0.6 ? 1.3 : 0.9;
      ctx.stroke();
    }
    if (!reduce && visible) requestAnimationFrame(frame);
  }
  size();
  window.addEventListener("resize", function(){ size(); if (reduce) frame(performance.now()); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function(en){
      var was = visible; visible = en[0].isIntersecting;
      if (visible && !was && !reduce) requestAnimationFrame(frame);
    }).observe(cv);
  }
  requestAnimationFrame(frame);
})();
