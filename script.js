(function(){
  "use strict";

  /* ---- язык: EN-словарь, RU берём из исходной вёрстки ---- */
  var I18N_EN = {
    "meta.title": "VRAEL STUDIO — Telegram bots, websites, and AI assistants for business",
    "meta.desc": "A digital product studio. Telegram bots, landing pages, websites, and AI assistants for business — designed, built, and launched for you.",
    "meta.ogTitle": "VRAEL STUDIO — digital products that work",
    "meta.ogDesc": "Telegram bots, landing pages, websites, and AI assistants for business.",
    "aria.top": "VRAEL STUDIO — back to top",
    "aria.nav": "Sections",
    "aria.lang": "Language",
    "aria.scroll": "Scroll down",
    "nav.services": "Services",
    "nav.plans": "Care plans",
    "nav.case": "Work",
    "nav.process": "Process",
    "nav.faq": "FAQ",
    "nav.book": "Book now",
    "nav.channel": "Channel",
    "hero.kicker": "Digital product studio",
    "hero.line1": "Digital products",
    "hero.line2": "<em>that work</em> for&nbsp;you.",
    "hero.lead": "Telegram bots, landing pages, websites, and&nbsp;AI assistants. Precise, fast, and turnkey.",
    "hero.ctaBook": "Book a consultation",
    "hero.ctaCase": "See the work",
    "hero.spec1l": "Telegram bot",
    "hero.spec1v": "from $60",
    "hero.spec2l": "First results",
    "hero.spec2v": "in a few days",
    "hero.spec3l": "Consultation",
    "hero.spec3v": "free",
    "manifest": "Less noise. More inquiries. We&nbsp;build bots and&nbsp;websites that look premium and&nbsp;bring in clients&nbsp;— without long approval cycles or extra middlemen.",
    "stage.kicker": "One system",
    "stage.title": "The site sells.<br><em>The bot takes the leads.</em>",
    "stage.lead": "Everything in one look: the website, Telegram bot, and&nbsp;AI assistant work together, and new inquiries land in your Telegram.",
    "stage.mockTitle": "Your business.<br><i>Your website.</i>",
    "stage.phoneHead": "Leads",
    "stage.msg1": "New inquiry from the site",
    "stage.msg2": "Name, phone, service",
    "stage.msg3": "New booking: tomorrow, 3:00&nbsp;p.m.",
    "svc.kicker": "Services",
    "svc.title": "Five products.<br><em>One standard.</em>",
    "svc.1.title": "Telegram bots",
    "svc.1.body": "Online booking, order intake, catalogs, payments, broadcasts, and owner alerts.",
    "svc.1.price": "<span>from</span> $60",
    "svc.2.title": "Landing pages",
    "svc.2.body": "A single page that sells: a sharp offer, precise design, and leads delivered straight to&nbsp;Telegram.",
    "svc.2.price": "<span>from</span> $100",
    "svc.3.title": "Websites",
    "svc.3.body": "Multi-page sites for companies and specialists. Responsive, fast, clearly structured.",
    "svc.3.price": "<span>from</span> $190",
    "svc.4.title": "AI assistants",
    "svc.4.body": "An assistant that answers clients 24/7, advises, and captures leads.",
    "svc.4.price": "<span>from</span> $125",
    "svc.5.title": "Domain &amp; site launch",
    "svc.5.body": "We'll connect your .com or .ru domain, HTTPS, and hosting&nbsp;— so the site lives at your business address.",
    "svc.5.price": "<span>from</span> $20",
    "plans.kicker": "Care plans",
    "plans.title": "Your site and bot,<br><em>looked after.</em>",
    "plans.note": "Monthly plans so the product doesn't stall after launch. There's no online checkout&nbsp;— write to us, and we'll set you up.",
    "plans.s.tier": "Start",
    "plans.s.title": "Steady operation",
    "plans.s.lead": "Hosting, uptime for your bot or site, and small fixes&nbsp;— no surprises.",
    "plans.s.price": "<span>from</span> $19<small>/mo</small>",
    "plans.s.f1": "Hosting and uptime for your bot or site",
    "plans.s.f2": "Bug fixes",
    "plans.s.f3": "1 small edit per month",
    "plans.s.term": "3 months — $50 (−10%) · 6 months — $95 (−15%)",
    "plans.badge": "Best value / most popular",
    "plans.b.tier": "Business",
    "plans.b.title": "Support and growth",
    "plans.b.lead": "Everything in Start, plus edits, updates, and an AI assistant for your clients.",
    "plans.b.price": "<span>from</span> $39<small>/mo</small>",
    "plans.b.f1": "Everything in the Start plan",
    "plans.b.f2": "Up to 3 edits per month",
    "plans.b.f3": "Price and photo updates",
    "plans.b.f4": "AI assistant for your clients",
    "plans.b.f5": "Reply within a day",
    "plans.b.term": "3 months — $100 (−10%) · 6 months — $190 (−15%)",
    "plans.b.offer": "Order a site or bot with this plan, and the first month is free.",
    "plans.p.tier": "Premium",
    "plans.p.title": "No limits",
    "plans.p.lead": "Everything in Business, unlimited edits, a leads report, and priority support.",
    "plans.p.price": "<span>from</span> $75<small>/mo</small>",
    "plans.p.f1": "Everything in the Business plan",
    "plans.p.f2": "Edits without a cap (within reason)",
    "plans.p.f3": "Monthly leads report",
    "plans.p.f4": "Priority support",
    "plans.p.term": "3 months — $200 (−10%) · 6 months — $380 (−15%)",
    "plans.foot": "Pay for a longer term and save: 3 months −10%, 6 months −15%. For 14 days after handover, small edits are free. One-off edits without a plan start at $6.",
    "plans.ctaBot": "Choose a plan in Telegram",
    "plans.ctaTg": "Message @vraelstudio",
    "case.kicker": "Live right now",
    "case.title": "The booking bot<br><em>VRAEL STUDIO</em>",
    "case.lead": "This is our own bot. A client picks a service, format, and time&nbsp;— and we get the request instantly. Try it yourself: this is the same product we'll build for you.",
    "case.s1t": "Consultation",
    "case.s1v": "30 min",
    "case.s2t": "Booking window",
    "case.s2v": "7 days",
    "case.s3t": "Reminder",
    "case.s3v": "2 hours ahead",
    "case.cta": "Open @vraelstudio_bot",
    "case.bot": "bot",
    "chat.1": "Hello! This is VRAEL STUDIO. Choose a service for your consultation:",
    "chat.k1a": "Telegram bot",
    "chat.k1b": "Landing page",
    "chat.k1c": "Full website",
    "chat.k1d": "AI assistant",
    "chat.2": "Meeting format?",
    "chat.k2a": "📞 Call",
    "chat.k2b": "💬 Telegram chat",
    "chat.3": "Open times tomorrow:",
    "chat.4": "You're all set. You're booked for tomorrow at 3:00&nbsp;p.m. I'll remind you 2 hours before.",
    "notice.title": "New request",
    "notice.sub": "Landing page · tomorrow, 3:00 p.m.",
    "concepts.kicker": "Concepts",
    "concepts.title": "What your project<br><em>could look like.</em>",
    "concepts.note": "Studio demonstration concepts. These are not client projects&nbsp;— they show our approach and standard.",
    "concepts.tag": "Concept",
    "concepts.1.type": "Landing page",
    "concepts.1.mock": "Coffee<br>with character",
    "concepts.1.btn": "Order",
    "concepts.1.title": "Landing page for a coffee shop",
    "concepts.1.body": "A menu, offers, and an order button in&nbsp;Telegram&nbsp;— all on one page.",
    "concepts.2.type": "AI assistant",
    "concepts.2.q": "Will a size M work?",
    "concepts.2.title": "AI consultant for a store",
    "concepts.2.body": "Answers questions about products and shipping, helps customers choose, and passes the request to a manager.",
    "concepts.3.type": "Website",
    "concepts.3.cal": "Trial lesson",
    "concepts.3.title": "Website for a tutor",
    "concepts.3.body": "Lesson programs, a schedule, and booking for a trial session.",
    "process.kicker": "Process",
    "process.title": "Four steps<br><em>to launch.</em>",
    "process.1.title": "Intro",
    "process.1.body": "Write to us on Telegram or email. We discuss the brief, goals, and budget.",
    "process.2.title": "Prototype",
    "process.2.body": "We share the structure and design, then align on the details.",
    "process.3.title": "Build",
    "process.3.body": "We build the project and show progress along the way. Fast, without cutting corners.",
    "process.4.title": "Launch",
    "process.4.body": "We test, go live, and help with the first round of edits.",
    "why.kicker": "Why us",
    "why.title": "Studio speed.<br><em>Craft-level care.</em>",
    "why.1.title": "Fast",
    "why.1.body": "A proven process and ready-made building blocks. What often takes weeks, we deliver in days.",
    "why.2.title": "Beautiful",
    "why.2.body": "Design you'll be proud to show clients and partners.",
    "why.3.title": "Direct",
    "why.3.body": "We talk on Telegram or email. No account managers, no long approval chains.",
    "why.4.title": "Turnkey",
    "why.4.body": "Design, development, launch. You don't need to know the technical side.",
    "why.5.title": "Honest pricing",
    "why.5.body": "We lock the price before we start. No hidden add-ons.",
    "why.6.title": "Support",
    "why.6.body": "We help with edits and improvements after launch.",
    "faq.kicker": "FAQ",
    "faq.title": "The essentials,<br><em>briefly.</em>",
    "faq.1.q": "How long does a project take?",
    "faq.1.a": "A straightforward bot or landing page usually takes a few days. For larger projects, we agree on a timeline up front and lock it in.",
    "faq.2.q": "How does payment work?",
    "faq.2.a": "Typically a deposit before we start and the balance on delivery. We'll agree on the exact terms before work begins.",
    "faq.3.q": "Do I need to be technical?",
    "faq.3.a": "No. You tell us about the business and the brief. We handle the rest and explain everything in plain language.",
    "faq.4.q": "Can I change things later?",
    "faq.4.a": "Yes. For 14 days after handover, small edits are free. After that, one-off edits start at $6, or you can join a monthly care plan for hosting, edits, and AI support. Order a site or bot with the Business plan, and the first month is free.",
    "faq.5.q": "Can the site use my own .com or .ru domain?",
    "faq.5.a": "Yes. We'll connect your domain, set up HTTPS and hosting&nbsp;— and the site will open at your business address. You pay for the domain at the registrar, usually about $10–15 a year. Our setup and launch starts at $20.",
    "final.kicker": "Let's start",
    "final.title": "Tell us about the brief.<br><em>We'll take it from there.</em>",
    "final.lead": "A free 30-minute consultation. Email or Telegram&nbsp;— whichever you prefer.",
    "final.ctaBook": "Book a consultation",
    "final.ctaTg": "Message @vraelstudio",
    "final.channel": "Our Telegram channel",
    "foot.studio": "Studio",
    "foot.contact": "Contact",
    "foot.bot": "Booking bot",
    "foot.channel": "Our Telegram channel",
    "foot.tag": "Bots, websites, and AI for business. Available worldwide."
  };

  var origText = new Map();
  var origHtml = new Map();
  var origAria = new Map();
  var origMeta = null;
  var mt = null;
  var words = [];
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resolveLang(){
    var q = /(?:^\?|&)lang=(en|ru)(?:&|$)/.exec(location.search);
    if (q) return q[1];
    try {
      var saved = localStorage.getItem("vrael-lang");
      if (saved === "en" || saved === "ru") return saved;
    } catch (e) {}
    var nav = String(navigator.language || navigator.userLanguage || "en").toLowerCase();
    return nav.indexOf("ru") === 0 ? "ru" : "en";
  }

  function saveLang(lang){
    try { localStorage.setItem("vrael-lang", lang); } catch (e) {}
  }

  function syncUrl(lang){
    var url = new URL(location.href);
    url.searchParams.set("lang", lang);
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  function cacheOriginals(){
    if (origMeta) return;
    var desc = document.querySelector('meta[name="description"]');
    var ogt = document.querySelector('meta[property="og:title"]');
    var ogd = document.querySelector('meta[property="og:description"]');
    origMeta = {
      title: document.title,
      desc: desc ? desc.getAttribute("content") : "",
      ogTitle: ogt ? ogt.getAttribute("content") : "",
      ogDesc: ogd ? ogd.getAttribute("content") : ""
    };
    document.querySelectorAll("[data-i18n]").forEach(function(el){
      origText.set(el, el.textContent);
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function(el){
      origHtml.set(el, el.innerHTML);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function(el){
      origAria.set(el, el.getAttribute("aria-label") || "");
    });
  }

  function setMeta(name, value, attr){
    var el = document.querySelector(name);
    if (el) el.setAttribute(attr || "content", value);
  }

  function splitManifest(){
    mt = document.querySelector("[data-words]");
    words = [];
    if (!mt) return;
    var parts = mt.innerHTML.split(/(\s+)/);
    mt.innerHTML = parts.map(function(p){ return /^\s+$/.test(p) ? p : '<span class="w">' + p + "</span>"; }).join("");
    words = Array.prototype.slice.call(mt.querySelectorAll(".w"));
    if (reduce) words.forEach(function(w){ w.classList.add("on"); });
  }

  function applyLang(lang, opts){
    opts = opts || {};
    cacheOriginals();
    document.documentElement.lang = lang;
    document.documentElement.setAttribute("data-lang", lang);
    saveLang(lang);
    if (opts.syncUrl) syncUrl(lang);

    if (lang === "en") {
      document.title = I18N_EN["meta.title"];
      setMeta('meta[name="description"]', I18N_EN["meta.desc"]);
      setMeta('meta[property="og:title"]', I18N_EN["meta.ogTitle"]);
      setMeta('meta[property="og:description"]', I18N_EN["meta.ogDesc"]);
    } else {
      document.title = origMeta.title;
      setMeta('meta[name="description"]', origMeta.desc);
      setMeta('meta[property="og:title"]', origMeta.ogTitle);
      setMeta('meta[property="og:description"]', origMeta.ogDesc);
    }

    document.querySelectorAll("[data-i18n]").forEach(function(el){
      var key = el.getAttribute("data-i18n");
      el.textContent = (lang === "en" && I18N_EN[key]) ? I18N_EN[key] : (origText.get(el) || el.textContent);
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function(el){
      var key = el.getAttribute("data-i18n-html");
      el.innerHTML = (lang === "en" && I18N_EN[key]) ? I18N_EN[key] : (origHtml.get(el) || el.innerHTML);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function(el){
      var key = el.getAttribute("data-i18n-aria");
      el.setAttribute("aria-label", (lang === "en" && I18N_EN[key]) ? I18N_EN[key] : (origAria.get(el) || ""));
    });
    document.querySelectorAll("[data-lang-only]").forEach(function(el){
      if (el.getAttribute("data-lang-only") === lang) el.removeAttribute("hidden");
      else el.setAttribute("hidden", "");
    });
    document.querySelectorAll("[data-set-lang]").forEach(function(btn){
      btn.setAttribute("aria-pressed", btn.getAttribute("data-set-lang") === lang ? "true" : "false");
    });

    if (opts.resplit) {
      splitManifest();
      if (typeof onScroll === "function") onScroll();
    }
    document.documentElement.classList.add("i18n-ready");
  }

  var initialLang = resolveLang();
  applyLang(initialLang, { syncUrl: /(?:^\?|&)lang=(en|ru)(?:&|$)/.test(location.search) });

  document.querySelectorAll("[data-set-lang]").forEach(function(btn){
    btn.addEventListener("click", function(){
      var lang = btn.getAttribute("data-set-lang");
      if (lang !== "en" && lang !== "ru") return;
      applyLang(lang, { syncUrl: true, resplit: true });
    });
  });

  /* ---- год ---- */
  var y = document.getElementById("year"); if (y) y.textContent = new Date().getFullYear();

  /* ---- шапка ---- */
  var nav = document.getElementById("nav");
  function onNav(){ nav.classList.toggle("scrolled", window.scrollY > 40); }
  onNav();

  /* ---- манифест: разбиваем на слова ---- */
  splitManifest();

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
