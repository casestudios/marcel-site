/* The command menu: Ctrl K or Cmd K opens it. Type to filter sections, questions and commands. */
(function () {
  "use strict";

  var dlg = document.getElementById("cmdk");
  if (!dlg) return;
  var input = document.getElementById("cmdkInput");
  var list = document.getElementById("cmdkList");
  var emptyEl = document.getElementById("cmdkEmpty");
  var statusEl = document.getElementById("cmdkStatus");
  var openBtn = document.getElementById("cmdBtn");
  var keyEl = document.getElementById("cmdKey");
  var isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || "");
  if (keyEl) keyEl.textContent = isMac ? "⌘K" : "Ctrl K";

  function go(id) { if (window.MarcelNav) window.MarcelNav.go(id); else location.hash = id; }
  function nav(id) { return function () { go(id); }; }
  function cons(step) {
    return function () {
      go("try");
      if (window.MarcelConsole) window.MarcelConsole.jump(step);
    };
  }
  function short(s, n) { return s.length > n ? s.slice(0, n - 1).replace(/[\s,.]+$/, "") + "…" : s; }

  var items = [
    { g: "Go to", label: "The film: where Marcel is headed", hint: "Rendered", k: "top hero video night start 2:14", run: nav("film") },
    { g: "Go to", label: "Run it yourself", hint: "Simulated run", k: "try demo console simulator technician", run: nav("try") },
    { g: "Go to", label: "Measured so far", hint: "Proof", k: "numbers stats proof results measured", run: nav("proof") },
    { g: "Go to", label: "The recordings", hint: "Video", k: "today recordings videos real mill prototrak", run: nav("today") },
    { g: "Go to", label: "Your control stays off the network", hint: "Network", k: "network air gapped wiring hdmi usb security splitter", run: nav("network") },
    { g: "Go to", label: "When Marcel acts, and when it won’t", hint: "Rules", k: "rules ladder safety approve never", run: nav("rules") },
    { g: "Go to", label: "What a stopped night costs you", hint: "Calculator", k: "cost calculator money shop rate", run: nav("numbers") },
    { g: "Go to", label: "Questions shops ask first", hint: "FAQ", k: "faq questions answers", run: nav("faq") },
    { g: "Go to", label: "Pilot Marcel on one machine", hint: "Contact", k: "pilot contact email founder start", run: nav("pilot") },
    { g: "Console: a simulated run", label: "Run the console from the start", hint: "Start over", k: "play restart replay demo", run: function () { go("try"); if (window.MarcelConsole) window.MarcelConsole.replay(); } },
    { g: "Console: a simulated run", label: "Jump to: Marcel holds the feed", hint: "Hold", k: "hold stop overload", run: cons("hold") },
    { g: "Console: a simulated run", label: "Jump to: Marcel checks and texts", hint: "Explain", k: "explain alarm tool life text", run: cons("explain") },
    { g: "Console: a simulated run", label: "Jump to: your reply", hint: "Wait for you", k: "wait reply technician approve", run: cons("wait") },
    { g: "Console: a simulated run", label: "Jump to: the restart", hint: "Resume", k: "resume restart cycle start", run: cons("resume") },
    { g: "Console: a simulated run", stay: true, label: function () { return window.MarcelConsole && window.MarcelConsole.soundOn() ? "Turn machine sound off" : "Turn machine sound on"; }, hint: "Sound", k: "audio sound mute speaker", run: function () { if (window.MarcelConsole) window.MarcelConsole.toggleSound(); } },
    { g: "Film: where Marcel is headed", stay: true, label: function () { return window.MarcelFilm && window.MarcelFilm.playing() ? "Pause the film" : "Play the film"; }, hint: "", k: "video play pause film", run: function () { if (window.MarcelFilm) window.MarcelFilm.toggle(); } }
  ];
  if (window.MarcelFilm && window.MarcelFilm.beats) {
    window.MarcelFilm.beats.forEach(function (b, i) {
      items.push({ g: "Film: where Marcel is headed", label: short(b.say, 58), hint: b.chip, k: "film beat " + b.chip, run: function () { go("film"); window.MarcelFilm.seek(i); } });
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll(".faq details"), function (d, i) {
    if (!d.id) d.id = "q" + (i + 1);
    var q = d.querySelector("summary").textContent.trim();
    items.push({ g: "Questions", label: q, hint: "Answer", k: d.textContent, run: function () { d.open = true; go(d.id); var s = d.querySelector("summary"); if (s) s.focus({ preventScroll: true }); } });
  });
  items.push(
    { g: "Your numbers", label: "Try your own shop rate", hint: "Calculator", k: "rate hours stops cost", run: function () { go("numbers"); var r = document.getElementById("rate"); if (r) setTimeout(function () { r.focus({ preventScroll: true }); }, 60); } },
    { g: "Contact", stay: true, label: "Email about a pilot", hint: "hello@marcelcnc.com", k: "mail contact pilot", run: function () { var a = document.querySelector('.pilot a[href^="mailto:"]'); if (a) a.click(); } },
    { g: "Contact", label: "Copy the email address", hint: "Copy", k: "copy email clipboard", run: function () { go("pilot"); var c = document.querySelector("[data-copy]"); if (c) c.click(); } }
  );

  function labelOf(it) { return typeof it.label === "function" ? it.label() : it.label; }
  // every typed letter has to appear in order; word starts and runs of letters count for more
  function score(str, q) {
    str = str.toLowerCase();
    var si = 0, sc = 0, run = 0, last = -2;
    for (var qi = 0; qi < q.length; qi++) {
      var ch = q[qi];
      if (ch === " ") continue;
      var at = str.indexOf(ch, si);
      if (at < 0) return -1;
      sc += 1;
      if (at === last + 1) { run++; sc += 2 + run; } else { run = 0; if (last >= 0) sc -= Math.min(4, (at - last - 1) * 0.25); }
      if (at === 0 || /[\s:,\-–(]/.test(str[at - 1])) sc += 4;
      last = at; si = at + 1;
    }
    return sc;
  }
  // whole words and plain substrings first, loose letter matches last
  function wordStart(str, q) {
    for (var i = str.indexOf(q); i >= 0; i = str.indexOf(q, i + 1)) {
      if (i === 0 || /[\s:,(“–-]/.test(str[i - 1])) return true;
    }
    return false;
  }
  function match(it, q) {
    if (!q) return 1;
    var L = labelOf(it).toLowerCase(), K = (it.g + " " + (it.hint || "") + " " + (it.k || "")).toLowerCase();
    if (L.indexOf(q) === 0) return 1000 - L.length * 0.1;
    if (wordStart(L, q)) return 800 - L.length * 0.1;
    if (L.indexOf(q) > 0) return 600 - L.length * 0.1;
    if (wordStart(K, q)) return 400;
    if (K.indexOf(q) >= 0) return 300;
    var a = score(L, q);
    if (a >= 0) return 100 + a;
    var b = score(K, q);
    return b >= 0 ? b : -1;
  }

  var shown = [], active = 0, isOpen = false, lastFocus = null, sayTimer = 0;
  function say(msg) { clearTimeout(sayTimer); sayTimer = setTimeout(function () { if (statusEl) statusEl.textContent = msg; }, 450); }
  function render(q) {
    q = (q || "").trim().toLowerCase();
    shown = items.map(function (it, i) { return { it: it, s: match(it, q), i: i }; })
      .filter(function (x) { return x.s >= 0; });
    if (q) {
      shown.sort(function (a, b) { return b.s - a.s || a.i - b.i; });
      var best = shown.length ? shown[0].s : 0;
      shown = shown.filter(function (x) { return x.s >= best * 0.5; });
    }
    shown = shown.slice(0, q ? 9 : shown.length);
    list.textContent = "";
    list.hidden = !shown.length;
    if (emptyEl) emptyEl.hidden = !!shown.length;
    say(q ? (shown.length ? shown.length + (shown.length === 1 ? " result" : " results") : "Nothing matches") : "");
    if (!shown.length) { input.removeAttribute("aria-activedescendant"); return; }
    var group = null;
    shown.forEach(function (x, n) {
      if (!q && x.it.g !== group) {
        group = x.it.g;
        var h = document.createElement("li");
        h.className = "cmdk-group"; h.setAttribute("role", "presentation"); h.textContent = group;
        list.appendChild(h);
      }
      var li = document.createElement("li");
      li.className = "cmdk-item"; li.id = "cmdk-opt-" + n;
      li.setAttribute("role", "option"); li.setAttribute("aria-selected", "false");
      var l = document.createElement("span"); l.className = "cmdk-label"; l.textContent = labelOf(x.it);
      li.appendChild(l);
      if (x.it.hint) { var hnt = document.createElement("span"); hnt.className = "cmdk-hint"; hnt.textContent = x.it.hint; li.appendChild(hnt); }
      li.addEventListener("mousemove", function () { if (active !== n) setActive(n); });
      li.addEventListener("click", function () { runAt(n); });
      list.appendChild(li);
    });
    setActive(0);
  }
  function setActive(n) {
    if (!shown.length) return;
    active = (n + shown.length) % shown.length;
    Array.prototype.forEach.call(list.querySelectorAll(".cmdk-item"), function (li, i) { li.setAttribute("aria-selected", i === active ? "true" : "false"); });
    var el = document.getElementById("cmdk-opt-" + active);
    if (el) { input.setAttribute("aria-activedescendant", el.id); el.scrollIntoView({ block: "nearest" }); }
  }
  function runAt(n) {
    var x = shown[n];
    if (!x) return;
    close(!!x.it.stay);
    setTimeout(function () { x.it.run(); }, 20);
  }

  var walled = [];
  function open() {
    if (isOpen) return;
    isOpen = true;
    lastFocus = document.activeElement;
    walled = Array.prototype.filter.call(document.body.children, function (el) { return el !== dlg && el.tagName !== "SCRIPT" && !el.inert; });
    walled.forEach(function (el) { el.inert = true; });
    dlg.hidden = false;
    document.documentElement.classList.add("cmdk-open");
    if (window.MarcelNav && window.MarcelNav.lenis) window.MarcelNav.lenis.stop();
    if (openBtn) openBtn.setAttribute("aria-expanded", "true");
    input.value = "";
    input.placeholder = window.innerWidth < 560 ? "Search this page" : "Type a section, a question or a command";
    render("");
    input.focus();
  }
  function close(restoreFocus) {
    if (!isOpen) return;
    isOpen = false;
    dlg.hidden = true;
    walled.forEach(function (el) { el.inert = false; });
    walled = [];
    document.documentElement.classList.remove("cmdk-open");
    if (window.MarcelNav && window.MarcelNav.lenis) window.MarcelNav.lenis.start();
    if (openBtn) openBtn.setAttribute("aria-expanded", "false");
    if (restoreFocus !== false && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  input.addEventListener("input", function () { render(input.value); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
    else if (e.key === "PageDown") { e.preventDefault(); setActive(Math.min(active + 5, shown.length - 1)); }
    else if (e.key === "PageUp") { e.preventDefault(); setActive(Math.max(active - 5, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); runAt(active); }
  });
  dlg.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === "Tab") {
      // keep focus inside: the field and its close button
      var f = [input, dlg.querySelector(".cmdk-esc")];
      var i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  Array.prototype.forEach.call(dlg.querySelectorAll("[data-close]"), function (el) { el.addEventListener("click", function () { close(); }); });
  if (openBtn) openBtn.addEventListener("click", open);

  document.addEventListener("keydown", function (e) {
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      if (isOpen) close(); else open();
    }
  });
  window.MarcelPalette = { open: open, close: close };
})();
