/* Marcel v4 effects: the hero's toolpath, the film's glow, the night clock, the measured numbers,
   the cost of a stopped night, and the machined wordmark. Each one decorates content that already
   reads without it. None of the motion runs with reduced motion turned on. */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var phoneMQ = window.matchMedia("(max-width: 720px)");
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function easeInOut(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
  function pad(n) { return String(n).padStart(2, "0"); }
  function debounce(fn, ms) { var id; return function () { var args = arguments; clearTimeout(id); id = setTimeout(function () { fn.apply(null, args); }, ms); }; }
  var rootCss = getComputedStyle(document.documentElement);
  function token(name, fallback) { return (rootCss.getPropertyValue(name) || "").trim() || fallback; }
  var AMBER = token("--amber", "#f2a93b"), ALARM = token("--alarm", "#ff5c46"), RUN = token("--run", "#96c8a0");
  var RULE_HI = token("--rule-hi", "#51483d"), QUIET = token("--quiet", "#a49d92");
  function rgba(hex, a) { var n = parseInt(hex.replace("#", ""), 16); return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")"; }
  function fontsReady(cb) {
    if (document.fonts && document.fonts.ready) Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1200); })]).then(cb);
    else cb();
  }
  function onView(el, cb, threshold) {
    if (!("IntersectionObserver" in window)) { cb(); return; }
    var io = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { io.disconnect(); cb(); }
    }, { threshold: threshold || 0.4 });
    io.observe(el);
  }
  var SVGNS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }
  function text(parent, x, y, str, cls, anchor) {
    var t = svg("text", { x: x, y: y, "class": cls || "v-lbl", "text-anchor": anchor || "start" }, parent);
    t.textContent = str;
    return t;
  }

  /* ---------- header: the night clock and how far down the page you are ---------- */
  var bar = $("#bar"), progress = $("#progress"), shiftT = $("#shift .shift-t"), dawn = $("#pilot");
  if (bar && progress) {
    var FROM = 2 * 60 + 14, TO = 6 * 60 + 10; // the film's first and last beats
    var dawnAt = 1, queued = false;
    var measure = function () { dawnAt = dawn ? Math.max(1, dawn.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.55) : 1; };
    var update = function () {
      queued = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
      progress.style.transform = "scaleX(" + p.toFixed(4) + ")";
      if (shiftT) {
        var q = clamp(window.scrollY / dawnAt, 0, 1);
        var m = Math.round(FROM + q * (TO - FROM));
        var s = pad(Math.floor(m / 60)) + ":" + pad(m % 60);
        if (shiftT.textContent !== s) shiftT.textContent = s;
        bar.classList.toggle("is-dawn", q >= 0.999);
      }
    };
    window.addEventListener("scroll", function () { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    var remeasure = debounce(function () { measure(); update(); }, 120);
    window.addEventListener("resize", remeasure);
    window.addEventListener("load", remeasure);
    if ("ResizeObserver" in window) new ResizeObserver(remeasure).observe(document.body);
    measure(); update();
  }

  /* ---------- hero: a scan on arrival, and the toolpath under the cursor ---------- */
  var host = $(".hero-top"), baseCv = $("#dro"), fxCv = $("#droFx");
  if (host && baseCv && fxCv && baseCv.getContext) {
    var bctx = baseCv.getContext("2d"), fctx = fxCv.getContext("2d");
    var pathCv = document.createElement("canvas"), pctx = pathCv.getContext("2d");
    var dotsCv = document.createElement("canvas"), dctx = dotsCv.getContext("2d");
    var spotCv = document.createElement("canvas"), sctx = spotCv.getContext("2d");
    var W = 0, H = 0, SPOT = 170, FAINT = 0.022;
    var mouse = null, intro = null, introDone = reduce, dirty = true, visible = true, raf = 0, builtW = 0, builtH = 0;
    var pointerFx = finePointer && !reduce;
    var read = $("#droRead"), readX = read && read.querySelector('[data-ax="x"]'), readY = read && read.querySelector('[data-ax="y"]');
    if (read && pointerFx) read.hidden = false;

    // adaptive clearing: trochoidal loops in lanes, alternating direction like a real toolpath
    var buildPath = function () {
      pathCv.width = Math.max(1, Math.round(W * DPR)); pathCv.height = Math.max(1, Math.round(builtH * DPR));
      pctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      pctx.strokeStyle = AMBER; pctx.lineWidth = 1; pctx.lineJoin = "round";
      var r = 12, lane = 32, adv = 1.3, dir = 1;
      pctx.beginPath();
      for (var y = 18; y < builtH + r; y += lane) {
        var n = (W + 6 * r) / adv;
        for (var th = 0; th <= n; th += 0.3) {
          var cx = dir > 0 ? -3 * r + adv * th : W + 3 * r - adv * th;
          var x = cx + dir * r * Math.cos(th), yy = y + r * Math.sin(th);
          if (th === 0) pctx.moveTo(x, yy); else pctx.lineTo(x, yy);
        }
        dir = -dir;
      }
      pctx.stroke();
    };
    // the fixture plate: a faint grid of holes
    var buildDots = function () {
      dotsCv.width = Math.max(1, Math.round(W * DPR)); dotsCv.height = Math.max(1, Math.round(builtH * DPR));
      dctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      dctx.fillStyle = "rgba(239, 236, 230, 0.075)";
      for (var x = 16; x < W; x += 32) for (var y = 16; y < builtH; y += 32) dctx.fillRect(Math.round(x), Math.round(y), 1.5, 1.5);
    };
    var drawBase = function (upto) {
      bctx.setTransform(1, 0, 0, 1, 0, 0);
      bctx.clearRect(0, 0, baseCv.width, baseCv.height);
      bctx.drawImage(dotsCv, 0, 0);
      var w = Math.round(clamp(upto, 0, W) * DPR);
      if (w > 0) {
        bctx.globalAlpha = FAINT;
        bctx.drawImage(pathCv, 0, 0, w, pathCv.height, 0, 0, w, pathCv.height);
        bctx.globalAlpha = 1;
      }
    };
    var drawSpot = function (cx, cy, alpha) {
      var s = spotCv.width, sx = Math.round((cx - SPOT) * DPR), sy = Math.round((cy - SPOT) * DPR);
      sctx.globalCompositeOperation = "source-over";
      sctx.clearRect(0, 0, s, s);
      sctx.drawImage(pathCv, sx, sy, s, s, 0, 0, s, s);
      sctx.globalCompositeOperation = "destination-in";
      var g = sctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(0.45, "rgba(0,0,0,0.55)"); g.addColorStop(1, "rgba(0,0,0,0)");
      sctx.fillStyle = g; sctx.fillRect(0, 0, s, s);
      sctx.globalCompositeOperation = "source-over";
      fctx.globalAlpha = alpha; fctx.drawImage(spotCv, sx, sy); fctx.globalAlpha = 1;
    };
    var drawSweep = function (front) {
      var band = 260, slices = 10, sw = band / slices;
      for (var i = 0; i < slices; i++) {
        var a0 = clamp(front - band + i * sw, 0, W), a1 = clamp(front - band + (i + 1) * sw, 0, W);
        if (a1 - a0 < 0.5) continue;
        var sx = Math.round(a0 * DPR), w = Math.max(1, Math.round((a1 - a0) * DPR));
        fctx.globalAlpha = 0.42 * Math.pow((i + 1) / slices, 1.4);
        fctx.drawImage(pathCv, sx, 0, w, pathCv.height, sx, 0, w, pathCv.height);
      }
      fctx.globalAlpha = 1;
      if (front > -40 && front < W + 2) {
        var fx0 = front * DPR, glow = 44 * DPR;
        var g = fctx.createLinearGradient(fx0 - glow, 0, fx0, 0);
        g.addColorStop(0, rgba(AMBER, 0)); g.addColorStop(0.8, rgba(AMBER, 0.08)); g.addColorStop(1, rgba(AMBER, 0.5));
        fctx.fillStyle = g; fctx.fillRect(fx0 - glow, 0, glow + DPR, fxCv.height);
      }
    };
    var drawCross = function (x, y) {
      fctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var mx = Math.round(x) + 0.5, my = Math.round(y) + 0.5, arm = 120, gap = 11;
      fctx.lineWidth = 1;
      var gx = fctx.createLinearGradient(mx - arm, 0, mx + arm, 0);
      gx.addColorStop(0, rgba(AMBER, 0)); gx.addColorStop(0.5, rgba(AMBER, 0.42)); gx.addColorStop(1, rgba(AMBER, 0));
      fctx.strokeStyle = gx;
      fctx.beginPath(); fctx.moveTo(mx - arm, my); fctx.lineTo(mx - gap, my); fctx.moveTo(mx + gap, my); fctx.lineTo(mx + arm, my); fctx.stroke();
      var gy = fctx.createLinearGradient(0, my - arm, 0, my + arm);
      gy.addColorStop(0, rgba(AMBER, 0)); gy.addColorStop(0.5, rgba(AMBER, 0.42)); gy.addColorStop(1, rgba(AMBER, 0));
      fctx.strokeStyle = gy;
      fctx.beginPath(); fctx.moveTo(mx, my - arm); fctx.lineTo(mx, my - gap); fctx.moveTo(mx, my + gap); fctx.lineTo(mx, my + arm); fctx.stroke();
      fctx.strokeStyle = rgba(AMBER, 0.85);
      fctx.beginPath(); fctx.arc(mx, my, 5, 0, Math.PI * 2); fctx.stroke();
      fctx.setTransform(1, 0, 0, 1, 0, 0);
      if (readX) { readX.textContent = (x * 0.25).toFixed(2); readY.textContent = ((H - y) * 0.25).toFixed(2); }
    };
    var frame = function (now) {
      raf = 0;
      if (!visible || !W) return;
      var again = false;
      if (intro) {
        var k = clamp((now - intro.t0) / intro.dur, 0, 1);
        intro.front = -60 + easeInOut(k) * (W + 120);
        drawBase(intro.front);
        if (k >= 1) {
          intro = null; introDone = true; drawBase(W);
          dotsCv.width = dotsCv.height = 1; builtW = 0;
          if (!pointerFx) { pathCv.width = pathCv.height = 1; fctx.clearRect(0, 0, fxCv.width, fxCv.height); fxCv.width = fxCv.height = 1; }
        }
        else again = true;
        dirty = true;
      }
      if (dirty) {
        dirty = false;
        fctx.setTransform(1, 0, 0, 1, 0, 0);
        fctx.clearRect(0, 0, fxCv.width, fxCv.height);
        if (intro) drawSweep(intro.front);
        if (mouse && pointerFx) { drawSpot(mouse.x, mouse.y, 0.4); drawCross(mouse.x, mouse.y); }
      }
      if (read && pointerFx) read.classList.toggle("is-live", !!mouse);
      if (again) raf = requestAnimationFrame(frame);
    };
    var kick = function () { if (!raf) raf = requestAnimationFrame(frame); };
    var size = function () {
      var w = host.clientWidth, h = host.clientHeight;
      if (w === W && h === H && pathCv.width > 1) return;
      W = w; H = h;
      [baseCv, fxCv].forEach(function (c) { c.width = Math.max(1, Math.round(W * DPR)); c.height = Math.max(1, Math.round(H * DPR)); });
      if (pointerFx) spotCv.width = spotCv.height = Math.round(SPOT * 2 * DPR);
      if (W !== builtW || H > builtH) { builtW = W; builtH = H + 160; buildDots(); buildPath(); }
      drawBase(introDone ? W : (intro ? intro.front : 0));
      dirty = true; kick();
    };
    if (pointerFx) {
      host.addEventListener("pointermove", function (e) {
        var r = host.getBoundingClientRect();
        mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
        dirty = true; kick();
      });
      host.addEventListener("pointerleave", function () { mouse = null; dirty = true; kick(); });
    }
    if ("ResizeObserver" in window) new ResizeObserver(debounce(size, 120)).observe(host);
    else window.addEventListener("resize", debounce(size, 120));
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) { dirty = true; kick(); } }).observe(host);
    }
    size();
    fontsReady(function () {
      size();
      if (!reduce) { intro = { t0: performance.now() + 120, dur: 1700, front: -60 }; kick(); }
    });
  }

  /* ---------- the film lights the room around it ---------- */
  var film = $("#filmVideo"), glowCv = $("#filmGlow");
  if (film && glowCv && glowCv.getContext) {
    var gctx = glowCv.getContext("2d"), glowRun = false, gn = 0;
    var paint = function (src) {
      try { gctx.drawImage(src || film, 0, 0, glowCv.width, glowCv.height); glowCv.classList.add("is-on"); } catch (e) { /* not ready yet */ }
    };
    var glowLoop = function () {
      if (!glowRun) return;
      if (gn++ % (phoneMQ.matches ? 10 : 6) === 0 && film.readyState >= 2) paint();
      requestAnimationFrame(glowLoop);
    };
    film.addEventListener("playing", function () {
      if (reduce) { paint(); return; }
      if (!glowRun) { glowRun = true; requestAnimationFrame(glowLoop); }
    });
    film.addEventListener("pause", function () { glowRun = false; if (film.readyState >= 2) paint(); });
    film.addEventListener("loadeddata", function () { paint(); });
    film.addEventListener("seeked", function () { if (!glowRun) paint(); });
    var posterImg = $(".film-poster img");
    var fromPoster = function () { if (!glowCv.classList.contains("is-on") && posterImg.naturalWidth) paint(posterImg); };
    if (posterImg) { if (posterImg.complete) fromPoster(); else posterImg.addEventListener("load", fromPoster); }
  }

  /* ---------- odometer: digits roll like a parts counter ---------- */
  function Odo(el) {
    this.el = el; this.cols = []; this.skel = null;
    this.vis = document.createElement("span"); this.vis.className = "odo"; this.vis.setAttribute("aria-hidden", "true");
    this.sr = document.createElement("span"); this.sr.className = "sr-only";
    el.textContent = "";
    el.appendChild(this.vis); el.appendChild(this.sr);
  }
  Odo.prototype.build = function (str) {
    var self = this, di = 0;
    this.vis.textContent = ""; this.cols = []; this.skel = str.replace(/\d/g, "#");
    str.split("").forEach(function (ch) {
      if (/\d/.test(ch)) {
        var d = document.createElement("span"); d.className = "odo-d";
        var s = document.createElement("span"); s.className = "odo-s";
        for (var k = 0; k < 20; k++) { var c = document.createElement("span"); c.textContent = String(k % 10); s.appendChild(c); }
        s.style.transitionDelay = (di * 0.07).toFixed(2) + "s";
        d.appendChild(s); self.vis.appendChild(d); self.cols.push(s); di++;
      } else {
        var t = document.createElement("span"); t.className = "odo-c"; t.textContent = ch; self.vis.appendChild(t);
      }
    });
  };
  Odo.prototype.show = function (str, animate, sayIt) {
    if (sayIt !== false) this.sr.textContent = str;
    if (str.replace(/\d/g, "#") !== this.skel) { this.build(str); animate = false; }
    var digits = str.replace(/\D/g, "");
    this.cols.forEach(function (s, i) {
      s.style.transitionDuration = animate ? "" : "0s";
      s.style.transform = "translateY(-" + (10 + +digits[i]) + "em)";
    });
  };
  Odo.prototype.zero = function (str) {
    this.build(str);
    this.sr.textContent = str;
    this.cols.forEach(function (s) { s.style.transitionDuration = "0s"; s.style.transform = "translateY(0)"; });
  };
  window.MarcelOdo = Odo;

  /* ---------- measured numbers: roll in, with a small picture of each ---------- */
  $all("[data-odo]").forEach(function (el) {
    var str = el.textContent.trim();
    var o = new Odo(el);
    if (reduce) { o.show(str, false); return; }
    o.zero(str);
    onView(el, function () { void el.offsetWidth; o.show(str, true); }, 0.6);
  });

  var VIZ = {
    // 8 s early: the load climbing at 3.5 %/s, the hold at 93 %, and where it would have gone
    early: function (box) {
      var s = svg("svg", { viewBox: "0 0 260 78", "class": "viz", preserveAspectRatio: "xMinYMid meet" }, box);
      var X = function (t) { return 6 + (t + 7) * 15.5; }, Y = function (v) { return 60 - (v - 60) / 65 * 52; };
      svg("line", { x1: 6, x2: 254, y1: Y(121), y2: Y(121), "class": "v-over" }, s);
      text(s, 6, Y(121) - 4, "OVERLOAD", "v-lbl v-red");
      svg("line", { x1: 6, x2: 254, y1: 60.5, y2: 60.5, "class": "v-axis" }, s);
      var d = "M" + X(-7) + " " + Y(72) + " L" + X(-6) + " " + Y(72) + " L" + X(0) + " " + Y(93) + " C" + X(0.25) + " " + Y(93) + " " + X(0.35) + " " + Y(70) + " " + X(0.7) + " " + Y(60);
      svg("path", { d: d, "class": "v-load", pathLength: 1 }, s);
      svg("path", { d: "M" + X(0) + " " + Y(93) + " L" + X(8) + " " + Y(121), "class": "v-proj", pathLength: 1 }, s);
      svg("circle", { cx: X(0), cy: Y(93), r: 3, "class": "v-dot" }, s);
      svg("path", { d: "M" + X(8) + " " + (Y(121) - 4) + " l0 8", "class": "v-x" }, s);
      var g = svg("g", { "class": "v-late" }, s);
      svg("path", { d: "M" + X(0) + " 66 v4 H" + X(8) + " v-4", "class": "v-brace" }, g);
      text(g, (X(0) + X(8)) / 2, 77, "8 s TO SPARE", "v-lbl v-amb", "middle");
      text(s, X(0) - 5, 77, "HOLD", "v-lbl", "end");
    },
    // 6–11 s: from the alarm to a cited fix on the phone
    window: function (box) {
      var s = svg("svg", { viewBox: "0 0 260 78", "class": "viz", preserveAspectRatio: "xMinYMid meet" }, box);
      var X = function (t) { return 8 + t * 20; };
      svg("line", { x1: X(0), x2: X(12), y1: 44.5, y2: 44.5, "class": "v-axis" }, s);
      for (var i = 0; i <= 12; i++) svg("line", { x1: X(i) + 0.5, x2: X(i) + 0.5, y1: 44.5, y2: i % 6 === 0 ? 50 : 47.5, "class": "v-tick" }, s);
      svg("rect", { x: X(6), y: 37, width: X(11) - X(6), height: 15, "class": "v-band", rx: 1 }, s);
      svg("circle", { cx: X(0), cy: 44.5, r: 4, "class": "v-alarm" }, s);
      text(s, X(0), 28, "ALARM", "v-lbl v-red");
      text(s, (X(6) + X(11)) / 2, 28, "CITED FIX ON PHONE", "v-lbl v-amb", "middle");
      text(s, X(0), 66, "0", "v-lbl");
      text(s, X(6), 66, "6", "v-lbl", "middle");
      text(s, X(11), 66, "11", "v-lbl", "middle");
      text(s, X(12), 66, "s", "v-lbl", "end");
    },
    // 2,100+ pages: one dot each
    pages: function (box) {
      var cv = document.createElement("canvas"); cv.className = "viz viz-cv"; box.appendChild(cv);
      var cap = document.createElement("span"); cap.className = "viz-cap"; cap.textContent = "2,100 DOTS, ONE PER PAGE"; box.appendChild(cap);
      var c = cv.getContext("2d"), cols = 105, rows = 20, p = 0, shownK = reduce ? 1 : 0;
      var draw = function (k) {
        var w = box.clientWidth; if (!w) return;
        p = w / cols;
        var h = Math.ceil(p * rows);
        if (cv.width !== Math.round(w * DPR) || cv.height !== Math.round(h * DPR)) {
          cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR); cv.style.height = h + "px";
        }
        c.setTransform(DPR, 0, 0, DPR, 0, 0);
        c.clearRect(0, 0, w, h);
        var dot = Math.max(1, p * 0.58);
        for (var i = 0; i < cols; i++) {
          var lit = clamp(k * (cols + 18) - i, 0, 1);
          for (var j = 0; j < rows; j++) {
            var n = (i * 7 + j * 13) % 11;
            c.fillStyle = rgba(AMBER, (0.08 + lit * (0.32 + n * 0.03)).toFixed(3));
            c.fillRect(i * p, j * p, dot, dot);
          }
        }
      };
      draw(shownK);
      window.addEventListener("resize", debounce(function () { draw(shownK); }, 120));
      return function play() {
        if (reduce) { draw(1); return; }
        var t0 = performance.now();
        var step = function (now) { shownK = clamp((now - t0) / 1300, 0, 1); draw(easeOut(shownK)); if (shownK < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      };
    },
    // 0 invented: sixteen answers, every citation checked
    cites: function (box) {
      var s = svg("svg", { viewBox: "0 0 260 78", "class": "viz", preserveAspectRatio: "xMinYMid meet" }, box);
      for (var i = 0; i < 16; i++) {
        var x = 2 + i * 16, g = svg("g", { "class": "v-ans", style: "--i:" + i }, s);
        svg("rect", { x: x + 0.5, y: 22.5, width: 13, height: 17, rx: 1.5, "class": "v-page" }, g);
        svg("path", { d: "M" + (x + 3.5) + " 31.5 l2.6 2.6 l4.6 -5.2", "class": "v-check" }, g);
      }
      text(s, 2, 14, "16 TEST ANSWERS", "v-lbl");
      text(s, 2, 60, "0 INVENTED CITATIONS", "v-lbl v-grn");
    }
  };
  $all("[data-viz]").forEach(function (box) {
    var kind = box.getAttribute("data-viz");
    if (!VIZ[kind]) return;
    var play = VIZ[kind](box);
    if (reduce) { box.classList.add("is-on"); if (typeof play === "function") play(); return; }
    onView(box, function () { box.classList.add("is-on"); if (typeof play === "function") play(); }, 0.6);
  });

  /* ---------- what a stopped night costs: the totals and a year of nights ---------- */
  var rate = $("#rate"), hours = $("#hours"), stops = $("#stops");
  if (rate && hours && stops) {
    var money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
    var monthlyOdo = new Odo($("#monthly"));
    var yearly = $("#yearly"), math = $("#math"), nights = $("#nights"), say = $("#calcSay");
    var grid = $("#yearGrid"), yctx = grid && grid.getContext("2d");
    // the nights of 2026 in a fixed shuffled order, so the same nights stay red as the slider moves
    var order = [], rank = [];
    for (var di = 0; di < 365; di++) order.push(di);
    for (var j = 364, seed = 20261102; j > 0; j--) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      var k2 = seed % (j + 1), tmp = order[j]; order[j] = order[k2]; order[k2] = tmp;
    }
    order.forEach(function (d, i) { rank[d] = i; });
    var JAN1 = 4; // January 1, 2026 is a Thursday (Sunday = 0)
    var MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    var MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var litShown = 0, litTarget = 0, anim = 0;
    var drawYear = function (count) {
      if (!yctx) return;
      var w = grid.parentNode.clientWidth; if (!w) return;
      var cols = 53, p = w / cols, labelH = p >= 7 ? 16 : 0, h = Math.ceil(p * 7 + labelH);
      if (grid.width !== Math.round(w * DPR) || grid.height !== Math.round(h * DPR)) {
        grid.width = Math.round(w * DPR); grid.height = Math.round(h * DPR); grid.style.height = h + "px";
      }
      yctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      yctx.clearRect(0, 0, w, h);
      var cell = Math.max(2, p - Math.max(1, p * 0.2));
      for (var d = 0; d < 365; d++) {
        var pos = d + JAN1, cx = Math.floor(pos / 7) * p, cy = (pos % 7) * p;
        var f = clamp(count - rank[d], 0, 1);
        yctx.fillStyle = f > 0 ? rgba(ALARM, (0.25 + 0.7 * f).toFixed(3)) : "#26221d";
        yctx.fillRect(cx, cy, cell, cell);
      }
      if (labelH) {
        yctx.fillStyle = QUIET; yctx.font = "500 10px 'IBM Plex Mono', ui-monospace, monospace"; yctx.textBaseline = "alphabetic";
        MONTHS.forEach(function (m, i) {
          if (p < 10 && i % 2) return;
          yctx.fillText(m, Math.floor((MONTH_START[i] + JAN1) / 7) * p, h - 2);
        });
      }
    };
    var animateYear = function (to) {
      litTarget = to;
      if (reduce) { litShown = to; drawYear(litShown); return; }
      var from = litShown, t0 = performance.now(), dur = 520;
      cancelAnimationFrame(anim);
      var step = function (now) {
        var k = clamp((now - t0) / dur, 0, 1);
        litShown = from + (litTarget - from) * easeOut(k);
        drawYear(litShown);
        if (k < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    };
    var announce = debounce(function (m, y, n) {
      if (say) say.textContent = money.format(m) + " a month, " + money.format(y) + " a year, over " + n + " stopped nights.";
    }, 500);
    var calc = function (animate) {
      var r = +rate.value, h = +hours.value, s = +stops.value;
      $("#rateOut").textContent = money.format(r);
      $("#hoursOut").textContent = h + " h";
      $("#stopsOut").textContent = String(s);
      rate.setAttribute("aria-valuetext", money.format(r) + " per machine hour");
      hours.setAttribute("aria-valuetext", h + (h === 1 ? " hour" : " hours"));
      stops.setAttribute("aria-valuetext", s + (s === 1 ? " stop" : " stops") + " a month");
      var m = r * h * s, n = s * 12;
      monthlyOdo.show(money.format(m), animate && !reduce, true);
      yearly.textContent = money.format(m * 12);
      if (nights) nights.textContent = String(n);
      math.textContent = money.format(r) + " × " + h + " h × " + s + (s === 1 ? " stop" : " stops") + " a month";
      if (animate) { animateYear(n); announce(m, m * 12, n); }
      else { litShown = litTarget = n; drawYear(n); }
    };
    [rate, hours, stops].forEach(function (inp) { inp.addEventListener("input", function () { calc(true); }); });
    calc(false);
    if (!reduce && grid) {
      litShown = 0; drawYear(0);
      onView(grid, function () { animateYear(+stops.value * 12); }, 0.5);
    }
    window.addEventListener("resize", debounce(function () { drawYear(litShown); }, 120));
  }

  /* ---------- the wordmark gets faced, like stock under a face mill ---------- */
  var wm = $("#wordmark");
  if (wm && wm.getContext) {
    var wctx = wm.getContext("2d");
    var metal = document.createElement("canvas"), mctx = metal.getContext("2d");
    var cut = document.createElement("canvas"), cctx = cut.getContext("2d");
    var WORD = "Marcel", ww = 0, wh = 0, fs = 0, tx = 0, ty = 0, R = 0, prog = reduce ? 1 : 0, wmRaf = 0, chips = [];
    var font = function (px) { return "600 " + px + "px 'Barlow Semi Condensed', 'Barlow', 'Arial Narrow', sans-serif"; };
    var probe = document.createElement("canvas"), qctx = probe.getContext("2d", { willReadFrequently: true });
    // where the letters actually land, from the pixels: font metrics alone leave the M and the l a few pixels off
    var inkBox = function (px) {
      var w = Math.ceil(px * 3.6), h = Math.ceil(px * 1.5), ox = Math.ceil(px * 0.25), base = Math.ceil(px * 1.15);
      probe.width = w; probe.height = h;
      qctx.font = font(px); qctx.fillStyle = "#000"; qctx.textBaseline = "alphabetic";
      qctx.fillText(WORD, ox, base);
      var d = qctx.getImageData(0, 0, w, h).data, L = w, Rx = -1, T = h, B = -1;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          if (d[(y * w + x) * 4 + 3] > 24) { if (x < L) L = x; if (x > Rx) Rx = x; if (y < T) T = y; if (y > B) B = y; }
        }
      }
      return { left: L - ox, right: Rx + 1 - ox, asc: base - T, desc: B + 1 - base };
    };
    var layoutWM = function () {
      ww = wm.clientWidth; if (!ww) return false;
      var b0 = inkBox(160);
      fs = 160 * ww / (b0.right - b0.left);
      var b1 = inkBox(fs);
      fs = fs * ww / (b1.right - b1.left);
      var bx = inkBox(fs);
      probe.width = probe.height = 1;
      wh = Math.ceil(bx.asc + bx.desc + 6);
      tx = -bx.left; ty = Math.round(bx.asc + 3);
      R = wh * 0.62;
      [wm, metal, cut].forEach(function (c) { c.width = Math.round(ww * DPR); c.height = Math.round(wh * DPR); });
      wm.style.height = wh + "px";
      // the finished face: warm steel with face-mill swirl marks, clipped to the letters
      mctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      mctx.clearRect(0, 0, ww, wh);
      var g = mctx.createLinearGradient(0, 0, 0, wh);
      g.addColorStop(0, "#9b8d79"); g.addColorStop(0.45, "#5f554a"); g.addColorStop(1, "#2c2620");
      mctx.fillStyle = g; mctx.fillRect(0, 0, ww, wh);
      mctx.lineWidth = 1;
      for (var x = -R; x < ww + R; x += 7) {
        mctx.strokeStyle = (Math.round(x) % 21 === 0) ? "rgba(255,240,215,0.10)" : "rgba(20,16,12,0.16)";
        mctx.beginPath(); mctx.arc(x, wh / 2, R, -1.05, 1.05); mctx.stroke();
      }
      mctx.globalCompositeOperation = "destination-in";
      mctx.font = font(fs); mctx.fillStyle = "#000"; mctx.fillText(WORD, tx, ty);
      mctx.globalCompositeOperation = "source-over";
      return true;
    };
    var drawWM = function (k) {
      wctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      wctx.clearRect(0, 0, ww, wh);
      wctx.font = font(fs); wctx.lineWidth = 1; wctx.strokeStyle = RULE_HI;
      wctx.strokeText(WORD, tx, ty);
      if (k >= 1) {
        wctx.setTransform(1, 0, 0, 1, 0, 0); wctx.drawImage(metal, 0, 0);
        metal.width = metal.height = 1; cut.width = cut.height = 1; chips = [];
        return;
      }
      var cx = -R + k * (ww + 2 * R), cy = wh / 2;
      cctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      cctx.globalCompositeOperation = "source-over";
      cctx.clearRect(0, 0, ww, wh);
      cctx.fillStyle = "#000";
      cctx.beginPath(); cctx.rect(0, 0, Math.max(0, cx), wh); cctx.moveTo(cx + R, cy); cctx.arc(cx, cy, R, 0, Math.PI * 2); cctx.fill();
      cctx.globalCompositeOperation = "source-in";
      cctx.setTransform(1, 0, 0, 1, 0, 0);
      cctx.drawImage(metal, 0, 0);
      cctx.globalCompositeOperation = "source-over";
      wctx.setTransform(1, 0, 0, 1, 0, 0);
      wctx.drawImage(cut, 0, 0);
      wctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      // the cutter: its body, and its leading edge
      wctx.strokeStyle = rgba(AMBER, 0.18); wctx.lineWidth = 1;
      wctx.beginPath(); wctx.arc(cx, cy, R, 0, Math.PI * 2); wctx.stroke();
      var eg = wctx.createRadialGradient(cx, cy, R * 0.86, cx, cy, R * 1.04);
      eg.addColorStop(0, rgba(AMBER, 0)); eg.addColorStop(0.8, rgba(AMBER, 0.32)); eg.addColorStop(1, rgba(AMBER, 0));
      wctx.fillStyle = eg;
      wctx.beginPath(); wctx.arc(cx, cy, R * 1.04, -0.9, 0.9); wctx.arc(cx, cy, R * 0.86, 0.9, -0.9, true); wctx.fill();
      // chips thrown off the leading edge
      for (var i = 0; i < 3; i++) {
        var a = (Math.random() - 0.5) * 1.6;
        chips.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, vx: 2 + Math.random() * 4, vy: -2 - Math.random() * 3, life: 1 });
      }
      chips = chips.filter(function (c) { return c.life > 0; });
      chips.forEach(function (c) {
        c.x += c.vx; c.y += c.vy; c.vy += 0.35; c.life -= 0.05;
        wctx.fillStyle = rgba(AMBER, (0.8 * c.life).toFixed(3));
        wctx.fillRect(c.x, c.y, 2, 2);
      });
    };
    var runWM = function () {
      if (reduce) { prog = 1; drawWM(1); return; }
      var t0 = performance.now(), dur = 2600;
      var step = function (now) {
        prog = clamp((now - t0) / dur, 0, 1);
        drawWM(easeInOut(prog));
        if (prog < 1) wmRaf = requestAnimationFrame(step);
      };
      wmRaf = requestAnimationFrame(step);
    };
    fontsReady(function () {
      if (!layoutWM()) return;
      drawWM(prog >= 1 ? 1 : 0);
      onView(wm, runWM, 0.35);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (layoutWM()) drawWM(prog >= 1 ? 1 : easeInOut(prog)); });
      window.addEventListener("resize", debounce(function () {
        if (layoutWM()) drawWM(prog >= 1 ? 1 : easeInOut(prog));
      }, 150));
    });
  }

  /* ---------- the wiring diagram's pulses only run while you can see them ---------- */
  var wires = $(".wires");
  if (wires && wires.pauseAnimations && "IntersectionObserver" in window) {
    wires.pauseAnimations();
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting && !reduce) wires.unpauseAnimations(); else wires.pauseAnimations();
    }).observe(wires);
  }

  /* ---------- a light that follows the pointer, and buttons that lean toward it ---------- */
  if (finePointer && !reduce) {
    $all(".stat, .step, .faq details, .founder, .status li").forEach(function (el) { el.classList.add("spot"); });
    document.addEventListener("pointermove", function (e) {
      var el = e.target.closest && e.target.closest(".spot");
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty("--mx", (e.clientX - r.left).toFixed(0) + "px");
      el.style.setProperty("--my", (e.clientY - r.top).toFixed(0) + "px");
    }, { passive: true });
    $all(".btn:not(.btn-small)").forEach(function (b) {
      b.classList.add("mag");
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        b.style.transform = "translate(" + (dx * 4).toFixed(2) + "px, " + (dy * 3).toFixed(2) + "px)";
      });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
  }
})();
