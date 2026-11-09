(function () {
  "use strict";

  var doc = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  var Split = window.SplitText;
  if (gsap && ST) gsap.registerPlugin(ST);
  if (gsap && Split) gsap.registerPlugin(Split);

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- header ---------- */
  var bar = $("#bar");
  function onScroll() { bar.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- smooth scroll (desktop pointers only) ---------- */
  var lenis = null;
  if (!reduce && finePointer && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.12 });
    if (gsap && ST) {
      lenis.on("scroll", ST.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  // one way to move around the page, shared by links and the command menu
  function go(id, opts) {
    var el = document.getElementById(id);
    if (!el) return false;
    var top = id === "top";
    var offset = top ? 0 : -(bar.offsetHeight + 12);
    if (lenis) lenis.scrollTo(top ? 0 : el, { offset: offset, duration: 1.1, immediate: !!(opts && opts.instant) });
    else window.scrollTo({ top: top ? 0 : el.getBoundingClientRect().top + window.scrollY + offset, behavior: reduce || (opts && opts.instant) ? "auto" : "smooth" });
    if (!top && !(opts && opts.noFocus)) {
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    }
    return true;
  }
  window.MarcelNav = { go: go, lenis: lenis };

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href");
    if (!id || id.length < 2) return;
    if (go(id.slice(1))) e.preventDefault();
  });

  /* ---------- which section is on screen ---------- */
  var navLinks = $all(".nav a");
  if (navLinks.length && "IntersectionObserver" in window) {
    var byId = {};
    navLinks.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var link = byId[en.target.id];
        if (!link) return;
        if (en.isIntersecting) {
          navLinks.forEach(function (a) { a.removeAttribute("aria-current"); });
          link.setAttribute("aria-current", "true");
        } else if (link.getAttribute("aria-current") === "true" && en.boundingClientRect.top > 0) {
          link.removeAttribute("aria-current");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(byId).forEach(function (id) { var el = document.getElementById(id); if (el) spy.observe(el); });
  }

  /* ---------- headline: the one load moment ---------- */
  var h1 = $("#h1");
  function showH1() { if (h1) h1.classList.add("is-ready"); }
  if (doc.classList.contains("motion") && h1) {
    var revealed = false;
    var safety = setTimeout(showH1, 1600);
    var run = function () {
      if (revealed) return;
      revealed = true;
      clearTimeout(safety);
      if (!gsap || !Split) { showH1(); return; }
      var split = new Split(h1, { type: "lines", mask: "lines", linesClass: "line" });
      showH1();
      gsap.from(split.lines, {
        yPercent: 110, duration: 0.95, ease: "power3.out", stagger: 0.09,
        onComplete: function () { split.revert(); }
      });
    };
    if (document.fonts && document.fonts.ready) {
      Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 900); })]).then(run);
    } else { run(); }
  }

  /* ---------- the film and its log ---------- */
  var film = $("#filmVideo");
  if (film) {
    var toggle = $("#filmToggle");
    var playBtn = $("#filmPlay");
    var beats = $all("#log button");
    var cues = beats.map(function (b) { return parseFloat(b.getAttribute("data-t")); });
    var END = 30;
    var phoneMQ = window.matchMedia("(max-width: 720px)");
    var userPaused = reduce;
    var inView = true;
    var current = -1;

    var maybePlay = function () {
      if (userPaused || !inView) return;
      var p = film.play();
      if (p && p.catch) p.catch(function () { playBtn.hidden = false; });
    };
    var choose = function () {
      var phone = phoneMQ.matches;
      var src = film.getAttribute(phone ? "data-phone" : "data-desk");
      if (film.getAttribute("data-cur") === src) return;
      var t = film.currentTime || 0;
      film.setAttribute("data-cur", src);
      film.src = src;
      film.addEventListener("loadedmetadata", function () { try { film.currentTime = t; } catch (err) {} }, { once: true });
      maybePlay();
    };
    var sync = function () {
      var t = film.currentTime || 0;
      var i = 0;
      for (var k = 0; k < cues.length; k++) if (t >= cues[k]) i = k;
      if (i !== current) {
        beats.forEach(function (b, k) { b.setAttribute("aria-current", k === i ? "true" : "false"); });
        current = i;
      }
      var start = cues[i], end = i + 1 < cues.length ? cues[i + 1] : END;
      var p = Math.max(0, Math.min(1, (t - start) / (end - start)));
      beats.forEach(function (b, k) { b.style.setProperty("--p", k < i ? 1 : k === i ? p.toFixed(4) : 0); });
    };
    var loop = function () { sync(); if (!film.paused) requestAnimationFrame(loop); };

    if (phoneMQ.addEventListener) phoneMQ.addEventListener("change", choose);
    choose();
    sync();
    toggle.textContent = film.paused ? "Play" : "Pause";
    if (reduce) playBtn.hidden = false;

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) maybePlay(); else film.pause();
      }, { threshold: 0.2 }).observe(film);
    }

    film.addEventListener("play", function () {
      toggle.textContent = "Pause";
      playBtn.hidden = true;
      requestAnimationFrame(loop);
    });
    film.addEventListener("pause", function () { toggle.textContent = "Play"; });
    film.addEventListener("seeked", sync);
    film.addEventListener("timeupdate", function () { if (film.paused) sync(); });

    toggle.addEventListener("click", function () {
      if (film.paused) { userPaused = false; inView = true; maybePlay(); }
      else { userPaused = true; film.pause(); }
    });
    playBtn.addEventListener("click", function () { userPaused = false; inView = true; maybePlay(); });
    var seek = function (k) {
      try { film.currentTime = cues[k] + 0.02; } catch (err) {}
      userPaused = false; inView = true;
      maybePlay();
      sync();
    };
    beats.forEach(function (b, k) { b.addEventListener("click", function () { seek(k); }); });
    window.MarcelFilm = {
      toggle: function () { toggle.click(); },
      seek: seek,
      playing: function () { return !film.paused; },
      beats: beats.map(function (b) { return { chip: $(".chip", b).textContent, say: $(".say", b).textContent }; })
    };
  }

  /* ---------- recordings ---------- */
  var tabs = $all('[role="tab"]');
  if (tabs.length) {
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute("aria-controls")); });
    var select = function (i, focus) {
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        panels[k].hidden = !on;
        var v = $("video", panels[k]);
        if (!on && v) v.pause();
        if (on && v && !v.getAttribute("poster") && v.getAttribute("data-poster")) v.setAttribute("poster", v.getAttribute("data-poster"));
      });
      if (focus) tabs[i].focus();
      if (ST) ST.refresh();
    };
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(i, false); });
      t.addEventListener("keydown", function (e) {
        var n = tabs.length;
        if (e.key === "ArrowRight") { e.preventDefault(); select((i + 1) % n, true); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); select((i - 1 + n) % n, true); }
        else if (e.key === "Home") { e.preventDefault(); select(0, true); }
        else if (e.key === "End") { e.preventDefault(); select(n - 1, true); }
      });
    });
  }

  /* ---------- the ladder's rail ---------- */
  var ladder = $("#ladder");
  if (ladder) {
    var fill = $(".rail-fill", ladder);
    var layout = function () {
      var dots = $all(".step-dot", ladder);
      if (dots.length < 3) return;
      var box = ladder.getBoundingClientRect();
      var centre = function (d) { var r = d.getBoundingClientRect(); return r.top + r.height / 2 - box.top; };
      var top = centre(dots[0]);
      ladder.style.setProperty("--rail-top", top + "px");
      ladder.style.setProperty("--rail-h", (centre(dots[dots.length - 1]) - top) + "px");
      ladder.style.setProperty("--fill-h", (centre(dots[2]) - top) + "px");
      var firstDot = dots[0].getBoundingClientRect();
      $(".rail", ladder).style.left = (firstDot.left - box.left + firstDot.width / 2 - 1) + "px";
    };
    layout();
    window.addEventListener("resize", layout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    if (gsap && ST && !reduce) {
      gsap.fromTo(fill, { scaleY: 0 }, {
        scaleY: 1, ease: "none",
        scrollTrigger: { trigger: ladder, start: "top 72%", end: "bottom 62%", scrub: 0.6 }
      });
    }
  }

  /* ---------- copy the address ---------- */
  $all("[data-copy]").forEach(function (b) {
    var label = $(".copy-state", b);
    b.addEventListener("click", function () {
      var text = b.getAttribute("data-copy");
      var done = function (msg) {
        if (!label) return;
        label.textContent = msg;
        setTimeout(function () { label.textContent = "Copy"; }, 1800);
      };
      var select = function () {
        var range = document.createRange();
        range.selectNodeContents($(".addr", b) || b);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        done("Selected");
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done("Copied"); }, select);
      } else { select(); }
    });
  });

  /* ---------- phone menu ---------- */
  var menuBtn = $("#menuBtn"), menu = $("#menu");
  if (menuBtn && menu) {
    var closeMenu = function () { menu.hidden = true; menuBtn.setAttribute("aria-expanded", "false"); menuBtn.textContent = "Menu"; };
    menuBtn.addEventListener("click", function () {
      var open = menu.hidden;
      menu.hidden = !open;
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      menuBtn.textContent = open ? "Close" : "Menu";
    });
    menu.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("a")) closeMenu(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { closeMenu(); menuBtn.focus(); } });
    window.matchMedia("(min-width: 900px)").addEventListener("change", function (m) { if (m.matches) closeMenu(); });
  }

  if (ST) window.addEventListener("load", function () { ST.refresh(); });
})();
