/* The live console: Marcel's November 2 simulated run, redrawn.
   Everything on screen is a pure function of the run clock (t) and the moment the technician
   replied (R), so playing, pausing and jumping between steps never leaves stale state. */
(function () {
  "use strict";

  var root = document.getElementById("console");
  if (!root) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var gsap = window.gsap;
  var canScramble = !!(gsap && window.ScrambleTextPlugin) && !reduce;
  if (canScramble) gsap.registerPlugin(window.ScrambleTextPlugin);

  /* ---------- the run ---------- */
  var HOLD = 8.4, ALARM = 10.2, TOOL = 13.6, TEXT = 15.6, OPEN = 17.2, WAIT = 17.4, AUTO = 9;
  var RESET = 2.0, START = 4.6, DONE = 11.8, END = 13.4; // after the reply
  var CLOCK0 = 17 * 3600 + 9 * 60 + 2; // the screen clock at t = 0 (17:09:02)
  // Load climbs 3.5 %/s and reaches 93 % at the hold. Marcel's text says that was about 8 s before
  // overload, so at that rate overload sits near 93 + 3.5 x 8 = 121 %.
  var RATE = 3.5, PEAK = 93, OVER = PEAK + RATE * 8, TOP = 130, METER = 150, RISE = 2.4; // the climb starts at 72 %, 2.4 s in

  var MSG1 = [
    "Marcel stopped the cut at 93% spindle load, about 8 s before overload. Feed held, spindle turning, no alarm, part safe.",
    "What happened: load rose from 72% at 3.5 %/s on T02, block N270, right after T02 was replaced. Counter shows 37 left, not 300.",
    "Likely causes: 1. Chips packed or low coolant (demo history, 1 of 2 past cases). 2. New T02 wrong type or not seated. 3. Counter or program issue.",
    "Do this:\n1. Stay clear of the spindle, behind the guard.\n2. Check T02 type and seating, clear chips.\n3. Check the coolant nozzle.\nReply “fixed” or tell me what you found.",
    "Sources: none (no alarm). History is demo data."
  ];
  var MSG2 = ["Back to normal: T02 counter reset to 300. Cycle running, past N270 now at N330, spindle load 39%, feed 100%, no alarm. Note: T05 has only 6 pieces left."];

  // log: [time, tag, text, key]; times after the reply are relative to R
  var PRE = [
    [0.6, "READ", "Position page. Cycle running in MEM, block N250, tool T02. Spindle load 72%."],
    [3.6, "WATCH", "Load is climbing about 3.5% a second on T02. At this rate it overloads in about 13 seconds."],
    [HOLD, "HOLD", "Pressed FEED HOLD at 93% spindle load.", "hold"],
    [9.4, "CHECK", "Screen shows HOLD. Spindle turning, no alarm. Part safe."],
    [ALARM, "READ", "Alarm history: last spindle overload was SP9029 on October 29. No alarm now.", "page"],
    [TOOL, "READ", "Tool life: T02 shows 37 left, not 300, right after it was replaced.", "page"],
    [TEXT, "TEXT", "Texted the technician what happened and what to do."],
    [WAIT, "WAIT", "Holding the feed. A restart needs a person."]
  ];
  var POST = [
    [0.8, "READ", "Technician replied: T02 replaced. Taking that as the go-ahead to reset and restart."],
    [RESET, "KEYS", "Reset the T02 counter to 300.", "reset"],
    [3.2, "CHECK", "Tool life page shows T02 at 300."],
    [START, "KEYS", "Pressed CYCLE START.", "start"],
    [9.6, "CHECK", "Running past N270, now at N330. Load 39%, feed 100%, no alarm."],
    [DONE, "DONE", "Case closed and saved for the next shift."]
  ];

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
  function restarted(t, R) { return R !== null && t >= R + START; }

  function loadAt(t, R) {
    if (restarted(t, R)) {
      var k = clamp((t - (R + START)) / 2.4, 0, 1);
      return 6 + 33 * easeOut(k) + k * (0.7 * Math.sin(t * 5.1) + 0.4 * Math.sin(t * 1.7));
    }
    if (t >= HOLD) return PEAK - 87 * easeOut(clamp((t - HOLD) / 1.6, 0, 1));
    var u = clamp(t / HOLD, 0, 1), base = Math.max(PEAK - RATE * (HOLD - RISE), PEAK - RATE * (HOLD - t));
    return base + (1 - u) * (0.7 * Math.sin(t * 6.3) + 0.45 * Math.sin(t * 2.2 + 1));
  }
  function pageAt(t, R) {
    if (t < ALARM) return "pos";
    if (t < TOOL) return "alarm";
    if (restarted(t, R)) return "pos";
    return "tool";
  }
  function blockAt(t, R) {
    if (restarted(t, R)) {
      var s = t - (R + START);
      return s < 1.4 ? "N00270" : s < 2.6 ? "N00280" : s < 3.6 ? "N00290" : s < 4.6 ? "N00310" : "N00330";
    }
    return t < 3 ? "N00250" : t < 6.5 ? "N00260" : "N00270";
  }
  function phaseAt(t, R) {
    if (t < HOLD) return "watch";
    if (t < ALARM) return "hold";
    if (t < WAIT) return "explain";
    if (R === null || t < R) return "wait";
    return "resume";
  }
  function clockAt(t) {
    var s = Math.floor(CLOCK0 + t);
    var hh = Math.floor(s / 3600), mm = Math.floor(s / 60) % 60, ss = s % 60;
    return [hh, mm, ss].map(function (n) { return String(n).padStart(2, "0"); }).join(":");
  }
  function lockTime(t) {
    var s = Math.floor(CLOCK0 + t), hh = Math.floor(s / 3600), mm = Math.floor(s / 60) % 60;
    return (hh % 12 || 12) + ":" + String(mm).padStart(2, "0");
  }
  function phoneTime(t) { return lockTime(t) + " PM"; }
  function viewAt(t) { return t < OPEN ? "lock" : "thread"; }
  function logAt(t, R) {
    var out = PRE.filter(function (e) { return e[0] <= t; });
    if (R !== null) POST.forEach(function (e) { if (R + e[0] <= t) out.push([R + e[0], e[1], e[2], e[3]]); });
    return out;
  }
  function msgsAt(t, R) {
    var m = [];
    if (t >= TEXT) m.push({ id: "m1", who: "marcel", lines: MSG1, at: TEXT, shot: true });
    if (R !== null && t >= R) m.push({ id: "m2", who: "tech", lines: ["Replaced T02"], at: R });
    if (R !== null && t >= R + 10.6) m.push({ id: "m3", who: "marcel", lines: MSG2, at: R + 10.6 });
    // the first text arrives on the lock screen; only the second one is typed into an open thread
    var typing = R !== null && t >= R + 9.4 && t < R + 10.6;
    return { list: m, typing: typing };
  }
  function keyAt(t, R) {
    var presses = [[HOLD, "hold"], [ALARM, "page"], [TOOL, "page"]];
    if (R !== null) { presses.push([R + RESET, "reset"]); presses.push([R + START, "start"]); }
    var res = {};
    presses.forEach(function (p) {
      var d = t - p[0];
      if (d >= 0 && d < 0.8) res[p[1]] = "press";
      else if (d >= 0.8 && d < 3.2 && res[p[1]] !== "press") res[p[1]] = "ok";
    });
    return res;
  }
  function reticleAt(t, R, load) {
    var L = Math.round(load);
    if (R !== null && t >= R + 9.6) return ["block", "BLOCK N00330 ✓"];
    if (restarted(t, R)) return ["load", "LOAD " + L + "%"];
    if (R !== null && t >= R + RESET) return ["toolrow", "T02 300 / 300 ✓"];
    if (t >= TOOL) return ["toolrow", "T02 37 / 300"];
    if (t >= ALARM) return ["alarmrow", "SP9029 OCT 29"];
    if (t >= HOLD) return ["modehold", "FEED HOLD ✓"];
    if (t >= 3.4) return ["load", "LOAD " + L + "% ↑ 3.5%/s"];
    if (t >= 2.4) return ["tool", "TOOL T02"];
    if (t >= 1.4) return ["block", "BLOCK N00250"];
    return ["modemem", "MEM · RUNNING"];
  }
  var STATUS = {
    watch: "Marcel is reading the screen. Spindle load is climbing.",
    hold: "Feed held at 93%, about 8 seconds before overload. Part safe.",
    explain: "Checking alarm history and tool life, then texting the technician.",
    wait: "Waiting for the technician. Marcel won’t restart the machine on its own.",
    resume: "Technician replied. Marcel resets the counter and restarts, checking the screen after every key.",
    done: "Back to normal. The case is saved for the next shift."
  };

  /* ---------- elements ---------- */
  var screen = document.getElementById("screen");
  var bind = {};
  Array.prototype.forEach.call(screen.querySelectorAll("[data-bind]"), function (el) { bind[el.getAttribute("data-bind")] = el; });
  var pages = {};
  Array.prototype.forEach.call(screen.querySelectorAll("[data-page]"), function (el) { pages[el.getAttribute("data-page")] = el; });
  var targets = {};
  Array.prototype.forEach.call(screen.querySelectorAll("[data-ret]"), function (el) { targets[el.getAttribute("data-ret")] = el; });
  var modeStrt = screen.querySelector('[data-mode="strt"]');
  var modeHold = screen.querySelector('[data-mode="hold"]');
  var reticle = document.getElementById("reticle");
  var retLabel = document.getElementById("retLabel");
  var sweep = document.getElementById("sweep");
  var keys = {};
  Array.prototype.forEach.call(root.querySelectorAll("[data-key]"), function (el) { keys[el.getAttribute("data-key")] = el; });
  var stepBtns = Array.prototype.slice.call(root.querySelectorAll("[data-step]"));
  var statusEl = document.getElementById("csStatus");
  var logEl = document.getElementById("csLog");
  var msgsEl = document.getElementById("phMsgs");
  var replyBox = document.getElementById("phReply");
  var replyBtn = document.getElementById("phBtn");
  var hintEl = document.getElementById("phHint");
  var playBtn = document.getElementById("csPlay");
  var replayBtn = document.getElementById("csReplay");
  var trace = document.getElementById("trace");
  var tctx = trace.getContext("2d");
  var phone = document.getElementById("phone");
  var phLock = document.getElementById("phLock");
  var phThread = document.getElementById("phThread");
  var lkTime = document.getElementById("lkTime");
  var lkNote = document.getElementById("lkNote");
  var soundBtn = document.getElementById("csSound");
  var STEPS = ["watch", "hold", "explain", "wait", "resume"];
  phone.setAttribute("data-view", ""); // the first render sets the view and who can be focused

  /* ---------- sound: off until the visitor turns it on ---------- */
  var audio = null, soundOn = false;
  function ensureAudio() {
    if (audio) return audio;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    var ctx = new AC();
    var master = ctx.createGain(); master.gain.value = 0;
    var comp = ctx.createDynamicsCompressor();
    master.connect(comp); comp.connect(ctx.destination);
    // the spindle at 9000 rpm: 150 Hz, softened
    var hum = ctx.createOscillator(); hum.type = "sawtooth"; hum.frequency.value = 150;
    var hum2 = ctx.createOscillator(); hum2.type = "sine"; hum2.frequency.value = 300;
    var humF = ctx.createBiquadFilter(); humF.type = "lowpass"; humF.frequency.value = 420; humF.Q.value = 0.6;
    var humG = ctx.createGain(); humG.gain.value = 0;
    var h2g = ctx.createGain(); h2g.gain.value = 0.3;
    hum.connect(humF); hum2.connect(h2g); h2g.connect(humF); humF.connect(humG); humG.connect(master);
    hum.start(); hum2.start();
    // the cut itself: band-passed noise that follows the load and stops when the feed holds
    var buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), data = buf.getChannelData(0);
    for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    var noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
    var cutF = ctx.createBiquadFilter(); cutF.type = "bandpass"; cutF.frequency.value = 2200; cutF.Q.value = 1.2;
    var cutG = ctx.createGain(); cutG.gain.value = 0;
    noise.connect(cutF); cutF.connect(cutG); cutG.connect(master); noise.start();
    audio = { ctx: ctx, master: master, humG: humG, humF: humF, cutG: cutG, cutF: cutF, noise: buf };
    return audio;
  }
  function tone(freq, start, dur, type, gain) {
    var a = audio, o = a.ctx.createOscillator(), g = a.ctx.createGain();
    o.type = type || "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(a.master); o.start(start); o.stop(start + dur + 0.02);
  }
  function click(start, gain) {
    var a = audio, s = a.ctx.createBufferSource(), f = a.ctx.createBiquadFilter(), g = a.ctx.createGain();
    s.buffer = a.noise; f.type = "highpass"; f.frequency.value = 2500;
    g.gain.setValueAtTime(gain || 0.3, start); g.gain.exponentialRampToValueAtTime(0.0001, start + 0.035);
    s.connect(f); f.connect(g); g.connect(a.master); s.start(start, Math.random()); s.stop(start + 0.05);
  }
  function blip(kind) {
    if (!soundOn || !audio) return;
    var now = audio.ctx.currentTime + 0.01;
    if (kind === "hold") { click(now); tone(880, now + 0.03, 0.12, "square", 0.05); tone(660, now + 0.16, 0.16, "square", 0.05); }
    else if (kind === "page") { click(now, 0.22); tone(1760, now + 0.02, 0.05, "sine", 0.03); }
    else if (kind === "key") { click(now); }
    else if (kind === "start") { click(now); tone(990, now + 0.03, 0.14, "square", 0.04); }
    else if (kind === "text") { tone(1046.5, now, 0.32, "sine", 0.12); tone(1318.5, now + 0.11, 0.42, "sine", 0.1); }
    else if (kind === "send") {
      var s = audio.ctx.createBufferSource(), f = audio.ctx.createBiquadFilter(), g = audio.ctx.createGain();
      s.buffer = audio.noise; f.type = "bandpass"; f.Q.value = 2;
      f.frequency.setValueAtTime(700, now); f.frequency.exponentialRampToValueAtTime(3400, now + 0.18);
      g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.16, now + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      s.connect(f); f.connect(g); g.connect(audio.master); s.start(now); s.stop(now + 0.25);
    }
    else if (kind === "done") { tone(523.3, now, 0.3, "sine", 0.08); tone(659.3, now + 0.09, 0.3, "sine", 0.08); tone(784, now + 0.18, 0.5, "sine", 0.08); }
  }
  function soundTrack(load, cutting) {
    if (!audio) return;
    var now = audio.ctx.currentTime, live = soundOn && playing && inView;
    audio.humG.gain.setTargetAtTime(live ? 0.05 : 0, now, 0.12);
    audio.humF.frequency.setTargetAtTime(320 + load * 3, now, 0.2);
    audio.cutG.gain.setTargetAtTime(live && cutting ? 0.008 + load / 100 * 0.03 : 0, now, 0.06);
    audio.cutF.frequency.setTargetAtTime(1600 + load * 16, now, 0.2);
  }
  function setSound(on) {
    if (on && !ensureAudio()) return;
    soundOn = on;
    soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
    if (!audio) return;
    if (on && audio.ctx.state === "suspended") audio.ctx.resume();
    audio.master.gain.setTargetAtTime(on ? 0.6 : 0, audio.ctx.currentTime, 0.05);
    if (!on) setTimeout(function () { if (!soundOn && audio.ctx.state === "running") audio.ctx.suspend(); }, 250);
    render();
  }
  document.addEventListener("visibilitychange", function () {
    if (!audio || !soundOn) return;
    if (document.hidden) {
      audio.master.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.03);
      setTimeout(function () { if (document.hidden && audio.ctx.state === "running") audio.ctx.suspend(); }, 150);
    } else {
      audio.ctx.resume();
      audio.master.gain.setTargetAtTime(0.6, audio.ctx.currentTime, 0.05);
    }
  });
  function eventsBetween(a, b) {
    var ev = [[HOLD, "hold"], [ALARM, "page"], [TOOL, "page"], [TEXT, "text"]];
    if (R !== null) ev.push([R, "send"], [R + RESET, "key"], [R + START, "start"], [R + 10.6, "text"], [R + DONE, "done"]);
    ev.forEach(function (e) { if (a < e[0] && e[0] <= b) blip(e[1]); });
  }

  /* ---------- state ---------- */
  var t = 0, R = null, playing = false, inView = false, started = false, last = 0;
  var shown = {}; // last values written to the DOM
  var logCount = -1, msgKey = null, retKey = "", page = "";

  function set(name, value) {
    if (shown[name] === value) return;
    shown[name] = value;
    if (bind[name]) bind[name].textContent = value;
  }
  function setStyle(name, prop, value) {
    var k = name + ":" + prop;
    if (shown[k] === value) return;
    shown[k] = value;
    bind[name].style[prop] = value;
  }

  var strip = root.querySelector(".cs-steps");
  function revealStep(btn) {
    if (!strip || strip.scrollWidth <= strip.clientWidth + 1) return;
    var li = btn.parentNode, left = li.offsetLeft, right = left + li.offsetWidth, view = strip.clientWidth * 0.8;
    if (right > strip.scrollLeft + view) strip.scrollLeft = right - view;
    else if (left < strip.scrollLeft) strip.scrollLeft = Math.max(0, left - 4);
  }
  if (strip) strip.addEventListener("focusin", function (e) { var b = e.target.closest && e.target.closest("[data-step]"); if (b) revealStep(b); });

  function doSweep() {
    if (reduce) return;
    sweep.classList.remove("go");
    void sweep.offsetWidth;
    sweep.classList.add("go");
  }

  function placeReticle(name, label) {
    var el = targets[name];
    if (!el) return;
    var s = screen.getBoundingClientRect(), r = el.getBoundingClientRect();
    var pad = 4;
    var L = Math.max(1, r.left - s.left - pad), T = Math.max(1, r.top - s.top - pad);
    var Rr = Math.min(s.width - 1, r.right - s.left + pad), B = Math.min(s.height - 1, r.bottom - s.top + pad);
    reticle.style.transform = "translate(" + L.toFixed(1) + "px, " + T.toFixed(1) + "px)";
    reticle.style.width = Math.max(8, Rr - L) + "px";
    reticle.style.height = Math.max(8, B - T) + "px";
    reticle.classList.toggle("ret-below", r.top - s.top < 44);
    reticle.classList.toggle("ret-right", r.left - s.left + r.width / 2 > s.width * 0.6 || r.width > s.width * 0.5);
    var key = name + "|" + label.replace(/\d+%/g, "");
    if (key !== retKey) {
      retKey = key;
      if (canScramble) {
        gsap.killTweensOf(retLabel);
        gsap.to(retLabel, { duration: 0.5, scrambleText: { text: label, chars: "0123456789ABCDEFXN%/", speed: 0.6 } });
      } else { retLabel.textContent = label; }
    } else if (retLabel.textContent !== label && !(canScramble && gsap.isTweening(retLabel))) {
      retLabel.textContent = label;
    }
  }

  function renderLog(entries) {
    if (entries.length === logCount) return;
    var rebuild = entries.length < logCount || logCount < 0;
    if (rebuild) { logEl.textContent = ""; logCount = 0; }
    if (!entries.length) {
      var idle = document.createElement("li");
      idle.className = "lg-idle";
      idle.textContent = "Marcel’s steps show up here as it works.";
      logEl.appendChild(idle);
    } else if (logCount === 0 || logEl.querySelector(".lg-idle")) {
      var stale = logEl.querySelector(".lg-idle"); if (stale) stale.remove();
    }
    for (var i = logCount; i < entries.length; i++) {
      var e = entries[i];
      var li = document.createElement("li");
      li.className = "lg lg-" + e[1].toLowerCase();
      var time = document.createElement("span"); time.className = "lg-t"; time.textContent = clockAt(e[0]);
      var tag = document.createElement("span"); tag.className = "lg-tag"; tag.textContent = e[1];
      var txt = document.createElement("span"); txt.className = "lg-x"; txt.textContent = e[2];
      li.appendChild(time); li.appendChild(tag); li.appendChild(txt);
      logEl.appendChild(li);
      if (!rebuild && canScramble) gsap.from(txt, { duration: 0.6, scrambleText: { text: "", chars: "lowerCase", speed: 1 }, ease: "none" });
      if (!rebuild && !reduce) li.classList.add("lg-new");
    }
    logCount = entries.length;
    logEl.scrollTop = logEl.scrollHeight;
  }

  function bubble(m) {
    var li = document.createElement("li");
    li.className = "msg msg-" + m.who;
    if (m.shot) {
      var img = document.createElement("img");
      img.src = "media/alert-shot.jpg"; img.alt = "Screen capture sent with the alert";
      img.width = 560; img.height = 277; img.loading = "lazy";
      li.appendChild(img);
    }
    m.lines.forEach(function (line) {
      var p = document.createElement("p");
      p.textContent = line;
      li.appendChild(p);
    });
    var tm = document.createElement("span"); tm.className = "msg-time"; tm.textContent = phoneTime(m.at);
    li.appendChild(tm);
    return li;
  }
  var shownIds = null; // the texts in the thread now, or null before the first render
  function renderMsgs(state) {
    var ids = state.list.map(function (m) { return m.id; });
    var key = ids.join(",") + (state.typing ? "+typing" : "");
    if (key === msgKey) return;
    msgKey = key;
    var typingEl = msgsEl.querySelector(".msg-typing");
    if (typingEl) typingEl.remove();
    var grows = shownIds !== null && shownIds.length <= ids.length && shownIds.every(function (id, i) { return ids[i] === id; });
    if (grows) {
      // the thread only grows: add the new texts, so a screen reader hears each one once
      if (ids.length) { var empty0 = msgsEl.querySelector(".ph-empty"); if (empty0) empty0.remove(); }
      for (var i = shownIds.length; i < ids.length; i++) {
        var li = bubble(state.list[i]);
        if (!reduce) li.classList.add("msg-new");
        msgsEl.appendChild(li);
      }
    } else {
      // a jump or a restart: rebuild quietly instead of reading the whole thread again
      msgsEl.setAttribute("aria-live", "off");
      msgsEl.textContent = "";
      state.list.forEach(function (m) { msgsEl.appendChild(bubble(m)); });
      if (!ids.length) {
        var empty = document.createElement("li");
        empty.className = "ph-empty";
        empty.textContent = "No messages yet. Marcel texts when a machine needs a person.";
        msgsEl.appendChild(empty);
      }
      requestAnimationFrame(function () { msgsEl.setAttribute("aria-live", "polite"); });
    }
    shownIds = ids;
    if (state.typing) {
      var ty = document.createElement("li");
      ty.className = "msg msg-marcel msg-typing";
      ty.setAttribute("aria-hidden", "true");
      ty.innerHTML = "<i></i><i></i><i></i>";
      msgsEl.appendChild(ty);
    }
    // a new text opens at its first line, so the reader starts at the top of it
    var last = msgsEl.lastElementChild;
    if (last && !state.typing && last.classList.contains("msg")) msgsEl.scrollTop = Math.max(0, last.offsetTop - 8);
    else msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function drawTrace() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = trace.clientWidth, h = trace.clientHeight;
    if (!w || !h) return;
    if (trace.width !== Math.round(w * dpr) || trace.height !== Math.round(h * dpr)) {
      trace.width = Math.round(w * dpr); trace.height = Math.round(h * dpr);
    }
    var c = tctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    var css = getComputedStyle(root);
    var cInk = css.getPropertyValue("--ink").trim() || "#efece6";
    var cQuiet = css.getPropertyValue("--quiet").trim() || "#a49d92";
    var cRule = css.getPropertyValue("--rule").trim() || "#2e2922";
    var cAmber = css.getPropertyValue("--amber").trim() || "#f2a93b";
    var cAlarm = css.getPropertyValue("--alarm").trim() || "#ff5c46";
    var padL = 34, padR = 10, padT = 12, padB = 18;
    var W = w - padL - padR, H = h - padT - padB;
    // the last 17 seconds, and 7 seconds ahead, so the overload Marcel avoided stays in view
    var span = 24, t0 = t - span * 0.7, t1 = t0 + span;
    function X(tt) { return padL + ((tt - t0) / span) * W; }
    function Y(v) { return padT + (1 - v / TOP) * H; }
    c.font = "500 10px 'IBM Plex Mono', monospace";
    c.lineWidth = 1;
    [0, 50, 100].forEach(function (v) {
      c.strokeStyle = cRule; c.beginPath(); c.moveTo(padL, Y(v) + 0.5); c.lineTo(w - padR, Y(v) + 0.5); c.stroke();
      c.fillStyle = cQuiet; c.fillText(v + "%", 2, Y(v) + 3);
    });
    // the future, lightly shaded
    var nx = X(t);
    c.fillStyle = "rgba(0,0,0,0.28)"; c.fillRect(nx, padT, w - padR - nx, H);
    c.setLineDash([2, 3]); c.strokeStyle = cRule; c.beginPath(); c.moveTo(nx + 0.5, padT); c.lineTo(nx + 0.5, h - padB); c.stroke(); c.setLineDash([]);
    // overload
    c.setLineDash([4, 4]); c.strokeStyle = cAlarm; c.beginPath(); c.moveTo(padL, Y(OVER) + 0.5); c.lineTo(w - padR, Y(OVER) + 0.5); c.stroke(); c.setLineDash([]);
    c.fillStyle = cAlarm;
    var ow = c.measureText("OVERLOAD").width;
    if (t >= HOLD && X(HOLD + 8) < padL + ow + 120) c.fillText("OVERLOAD", w - padR - ow - 4, Y(OVER) - 4);
    else c.fillText("OVERLOAD", padL + 4, Y(OVER) - 4);
    // the load line
    c.save(); c.beginPath(); c.rect(padL, 0, W, h); c.clip();
    c.strokeStyle = cAmber; c.lineWidth = 2; c.beginPath();
    var step = Math.max(0.05, span / W), from = Math.max(0, t0), first = true;
    for (var tt = from; tt <= t + 1e-6; tt += step) {
      var x = X(tt), y = Y(loadAt(tt, R));
      if (first) { c.moveTo(x, y); first = false; } else c.lineTo(x, y);
    }
    c.stroke();
    // where it was heading when Marcel held the feed
    if (t >= HOLD) {
      c.setLineDash([3, 4]); c.strokeStyle = cAmber; c.globalAlpha = 0.65; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(X(HOLD), Y(PEAK)); c.lineTo(X(HOLD + 8), Y(OVER)); c.stroke();
      c.setLineDash([]); c.globalAlpha = 1;
      var ox = X(HOLD + 8), oy = Y(OVER);
      if (ox > padL && ox < w - padR) {
        c.strokeStyle = cAlarm; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(ox - 4, oy - 4); c.lineTo(ox + 4, oy + 4); c.moveTo(ox + 4, oy - 4); c.lineTo(ox - 4, oy + 4); c.stroke();
        var lbl = W > 420 ? "WOULD HAVE OVERLOADED" : "AVOIDED", lw = c.measureText(lbl).width;
        c.fillStyle = cAlarm; c.fillText(lbl, clamp(ox - lw / 2, padL + 2, w - padR - lw), oy + 19);
      }
    }
    c.restore();
    // events
    function mark(tt, label, color) {
      if (tt < t0 || tt > t) return;
      var x = X(tt);
      c.strokeStyle = color; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 0.5, padT); c.lineTo(x + 0.5, h - padB); c.stroke();
      c.fillStyle = color; c.fillText(label, clamp(x + 4, padL, w - padR - c.measureText(label).width), h - 5);
    }
    mark(HOLD, "FEED HOLD 93%", cAmber);
    if (R !== null) mark(R + START, "CYCLE START", cInk);
    // now
    c.fillStyle = cAmber; c.beginPath(); c.arc(nx, Y(loadAt(t, R)), 3.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = cQuiet; c.fillText("NOW", Math.min(nx + 5, w - padR - 22), Y(22));
  }

  function render() {
    var load = loadAt(t, R);
    var phase = phaseAt(t, R);
    var isRun = !(t >= HOLD && !restarted(t, R));
    var life = R !== null && t >= R + RESET ? 300 : 37;
    var p = pageAt(t, R);

    if (p !== page) {
      Object.keys(pages).forEach(function (k) { pages[k].hidden = k !== p; });
      set("title", p === "pos" ? "POSITION ALL" : p === "alarm" ? "ALARM HISTORY" : "TOOL LIFE");
      if (page !== "") doSweep();
      page = p;
    }
    set("prog", "O1001 " + blockAt(t, R));
    set("clock", "2026/11/02 " + clockAt(t));
    var runFor = Math.min(t, HOLD) + (restarted(t, R) ? t - (R + START) : 0);
    set("ax", (3.9 + 0.035 * runFor).toFixed(4));
    set("mx", (-16.0 + 0.035 * runFor).toFixed(4));
    set("cyc", "0H00M" + String(Math.floor(2 + runFor)).padStart(2, "0") + "S");
    set("actf", isRun ? "80.0 IN/MIN" : "0.0 IN/MIN");
    set("fact", isRun ? "80.0" : "0.0");
    set("load", String(Math.round(load)));
    setStyle("loadbar", "width", clamp(load / METER * 100, 0, 100).toFixed(1) + "%");
    bind.loadbar.parentNode.classList.toggle("hot", load >= 85);
    set("life", String(life));
    setStyle("lifebar", "width", (life / 300 * 100).toFixed(1) + "%");
    set("used", life === 300 ? "0" : "263");
    set("remain", String(life));
    set("tstat", life === 300 ? "OK" : "LOW");
    bind.tstat.className = life === 300 ? "g" : "y";
    targets.toolrow.classList.toggle("flash", R !== null && t >= R + RESET && t < R + RESET + 1.2);
    modeStrt.classList.toggle("on", isRun);
    modeHold.classList.toggle("on", !isRun);

    var ret = reticleAt(t, R, load);
    placeReticle(ret[0], ret[1]);

    var k = keyAt(t, R);
    Object.keys(keys).forEach(function (name) {
      keys[name].classList.toggle("press", k[name] === "press");
      keys[name].classList.toggle("ok", k[name] === "ok");
    });

    var done = R !== null && t >= R + DONE;
    var st = done ? STATUS.done : STATUS[phase];
    if (statusEl.textContent !== st) statusEl.textContent = st;
    root.setAttribute("data-phase", done ? "done" : phase);
    stepBtns.forEach(function (b) {
      var on = b.getAttribute("data-step") === phase;
      if (on) {
        if (b.getAttribute("aria-current") !== "true") { b.setAttribute("aria-current", "true"); revealStep(b); }
      } else b.removeAttribute("aria-current");
    });

    renderLog(logAt(t, R));
    renderMsgs(msgsAt(t, R));
    var view = viewAt(t);
    if (phone.getAttribute("data-view") !== view) {
      var lock = view === "lock";
      var carry = !lock && phLock.contains(document.activeElement);
      phThread.inert = lock;                                   // open the thread first, so focus can land in it
      if (carry) msgsEl.focus({ preventScroll: true });
      phLock.inert = !lock;
      phone.setAttribute("data-view", view);
      phLock.setAttribute("aria-hidden", lock ? "false" : "true");
      phThread.setAttribute("aria-hidden", lock ? "true" : "false");
    }
    var lt = lockTime(t);
    if (lkTime.textContent !== lt) lkTime.textContent = lt;
    lkNote.hidden = t < TEXT;
    soundTrack(load, isRun);
    var waiting = phase === "wait" && t >= WAIT;
    if (!waiting && !replyBox.hidden && replyBox.contains(document.activeElement)) msgsEl.focus({ preventScroll: true });
    replyBox.hidden = !waiting;
    if (waiting) {
      var left = Math.max(0, Math.ceil(WAIT + AUTO - t));
      var hint = "Your move. Marcel won\u2019t restart until you reply." + (playing && R === null ? " The technician answers in " + left + " s if you don\u2019t." : "");
      if (hintEl.textContent !== hint) hintEl.textContent = hint;
    }
    drawTrace();
  }

  /* ---------- playback ---------- */
  var looping = false;
  function loop() { if (!looping && playing && inView) { looping = true; last = performance.now(); requestAnimationFrame(tick); } }
  function setPlaying(on) {
    playing = on;
    root.classList.toggle("is-live", on && inView);
    playBtn.textContent = on ? "Pause" : (R !== null && t >= R + END ? "Play again" : "Play");
    if (on) loop();
    else soundTrack(loadAt(t, R), false);
  }
  function tick(now) {
    // the clock sleeps while paused or off screen, and the observer wakes it
    if (!playing || !inView) { looping = false; soundTrack(loadAt(t, R), false); return; }
    var dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (inView) {
      var before = t;
      t += dt;
      if (R === null && t >= WAIT + AUTO) { R = WAIT + AUTO; }
      eventsBetween(before, t);
      if (R !== null && t >= R + END) { t = R + END; render(); looping = false; setPlaying(false); return; }
      render();
    }
    requestAnimationFrame(tick);
  }
  function jump(step) {
    if (step === "watch") { t = 0; R = null; }
    else if (step === "hold") { t = HOLD; R = null; }
    else if (step === "explain") { t = ALARM; R = null; }
    else if (step === "wait") { t = WAIT; R = null; }
    else if (step === "resume") { if (R === null) R = Math.max(WAIT + 0.4, t); t = R; }
    logCount = -1; msgKey = null; retKey = "";
    render();
    if (!playing) setPlaying(true); else loop();
  }

  replyBtn.addEventListener("click", function () {
    if (R !== null) return;
    R = Math.max(t, WAIT);
    blip("send");
    render();
    if (!playing) setPlaying(true); else loop();
  });
  lkNote.addEventListener("click", function () {
    // the technician taps the notification and the thread opens
    if (t < OPEN) t = OPEN;
    started = true; inView = true;
    render();
    if (!playing) setPlaying(true); else loop();
    (replyBox.hidden ? msgsEl : replyBtn).focus({ preventScroll: true });
  });
  soundBtn.addEventListener("click", function () { setSound(!soundOn); });
  function stepBy(dir) {
    var i = STEPS.indexOf(phaseAt(t, R));
    var n = clamp(i + dir, 0, STEPS.length - 1);
    if (n === i && !(dir < 0 && i === 0)) return;
    started = true; inView = true;
    jump(STEPS[n]);
  }
  // shortcuts while focus is inside the console: K play or pause, arrows step, R reply
  document.addEventListener("keydown", function (e) {
    if (!inView || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!root.contains(document.activeElement)) return;
    var tg = e.target;
    if (tg && tg.closest && tg.closest('input, textarea, select, [contenteditable="true"], [role="tab"], .cmdk, video')) return;
    var k = e.key;
    if (k === "k" || k === "K") { e.preventDefault(); playBtn.click(); }
    else if ((k === "r" || k === "R") && !replyBox.hidden) { e.preventDefault(); replyBtn.click(); }
    else if (k === "ArrowRight" || k === "ArrowLeft") { e.preventDefault(); stepBy(k === "ArrowRight" ? 1 : -1); }
  });
  window.MarcelConsole = {
    replay: function () { replayBtn.click(); },
    jump: function (step) { started = true; inView = true; jump(step); },
    toggleSound: function () { setSound(!soundOn); },
    soundOn: function () { return soundOn; }
  };
  playBtn.addEventListener("click", function () {
    if (playing) { setPlaying(false); return; }
    if (R !== null && t >= R + END) { t = 0; R = null; logCount = -1; msgKey = null; retKey = ""; }
    started = true; inView = true;
    setPlaying(true);
  });
  replayBtn.addEventListener("click", function () {
    t = 0; R = null; logCount = -1; msgKey = null; retKey = ""; page = "";
    started = true; inView = true;
    render();
    setPlaying(true);
  });
  stepBtns.forEach(function (b) { b.addEventListener("click", function () { started = true; inView = true; jump(b.getAttribute("data-step")); }); });

  if ("IntersectionObserver" in window) {
    var steps = []; for (var q = 0; q <= 20; q++) steps.push(q / 20);
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      inView = e.isIntersecting && e.intersectionRect.height >= Math.min(e.boundingClientRect.height * 0.35, window.innerHeight * 0.45);
      root.classList.toggle("is-live", inView && playing);
      if (inView && !started && !reduce) { started = true; setPlaying(true); }
      if (inView) loop();
    }, { threshold: steps }).observe(root);
  }
  window.addEventListener("resize", function () { render(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);

  render();
  setPlaying(false);
})();
