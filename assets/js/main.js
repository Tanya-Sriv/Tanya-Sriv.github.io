// Theme toggle: cycles auto → light → dark. "auto" follows the OS setting.
// (The inline <head> script already applied the saved theme pre-paint.)
const themeBtn = document.querySelector(".theme-btn");
if (themeBtn) {
  const osDark = matchMedia("(prefers-color-scheme: dark)");
  const order = ["auto", "light", "dark"];
  const labels = { auto: "◐ auto", light: "☀ light", dark: "☾ dark" };
  const pref = () => localStorage.getItem("theme") || "auto";
  const apply = p => {
    document.documentElement.dataset.theme =
      p === "auto" ? (osDark.matches ? "dark" : "light") : p;
    themeBtn.textContent = labels[p];
  };
  themeBtn.addEventListener("click", () => {
    const next = order[(order.indexOf(pref()) + 1) % order.length];
    localStorage.setItem("theme", next);
    apply(next);
  });
  osDark.addEventListener("change", () => apply(pref())); // live OS changes in auto mode
  apply(pref());
}

// Mascot: click to jump, giggle (synthesized — no audio files), and speak.
const mascot = document.getElementById("mascot");
if (mascot) {
  const phrases = ["ba-na-naaa! 🍌", "bello!", "bee-boop!", "hee-hee-ha!", "ba-naa-na?!", "mo-cha ba-na-na! ☕🍌"];

  // Optional recorded clips: drop files into /assets/audio/ with these names
  // and they're used automatically (recordings you own — your own voice, a
  // kid you know, or generated audio you have rights to). Missing files fall
  // back to text-to-speech seamlessly.
  const clipFiles = {
    "ba-na-naaa! 🍌": "banana.mp3",
    "bello!":         "bello.mp3",
    "bee-boop!":      "beeboop.mp3",
    "hee-hee-ha!":    "laugh.mp3",
    "ba-naa-na?!":    "banana-question.mp3",
    "mo-cha ba-na-na! ☕🍌": "mocha-banana.mp3",
  };
  const clips = {};   // phrase -> Audio
  Object.entries(clipFiles).forEach(([phrase, file]) => {
    const a = new Audio("/assets/audio/" + file);
    a.preload = "auto";
    clips[phrase] = a;                                  // recording wins by default
    a.addEventListener("error", () => { delete clips[phrase]; }, { once: true });
    // only a genuinely missing/broken file falls back to TTS
  });
  const bubble = document.createElement("div");
  bubble.className = "mascot-bubble";
  document.body.appendChild(bubble);
  let bubbleTimer, audioCtx;

  // Original goofy giggle: a run of wobbly triangle-wave chirps ending high.
  function giggle() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audioCtx.currentTime;
      const n = 5 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = "triangle";
        const start = t0 + i * 0.09;
        const last = i === n - 1;
        const f = (520 + Math.random() * 240 + (i % 2 ? 130 : 0)) * (last ? 1.5 : 1);
        o.frequency.setValueAtTime(f * 1.18, start);
        o.frequency.exponentialRampToValueAtTime(f * 0.82, start + (last ? 0.22 : 0.08));
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.16, start + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, start + (last ? 0.24 : 0.085));
        o.connect(g).connect(audioCtx.destination);
        o.start(start); o.stop(start + (last ? 0.25 : 0.09));
      }
    } catch (e) { /* audio blocked — stay silent, still jump */ }
  }

  // Speak the phrase out loud (Web Speech API), pitched up into squeaky-helper
  // register. Falls back to the synth giggle if speech isn't available.
  // Pick the most kid-like voice the visitor's system has: a real child voice
  // if one exists, else a light/high voice we can pitch up into cartoon-kid.
  let kidVoice = null;
  function pickVoice() {
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return;
    const rank = v => {
      const n = v.name.toLowerCase();
      if (/child|kid|junior|kandi|kathy/.test(n)) return 0;        // true kid voices
      if (/samantha|zira|jenny|aria|karen|tessa|moira|female|woman/.test(n)) return 1;
      if (/google (uk|us) english/.test(n)) return 2;              // light neutral
      return 3;
    };
    kidVoice = voices.filter(v => v.lang.startsWith("en"))
                     .sort((a, b) => rank(a) - rank(b))[0] || voices[0];
  }
  if ("speechSynthesis" in window) {
    pickVoice();                                        // may be empty on first call…
    speechSynthesis.addEventListener("voiceschanged", pickVoice);  // …loads async
  }

  // ----- focus mode (mutes all mascot audio; persists across visits) -----
  const focusBtn = document.querySelector(".focus-btn");
  let focused = false;
  try { focused = localStorage.getItem("focus") === "1"; } catch (e) {}
  function renderFocus() {
    if (!focusBtn) return;
    focusBtn.classList.toggle("on", focused);
    focusBtn.setAttribute("aria-pressed", String(focused));
    focusBtn.textContent = focused ? "⌁ focus ✓" : "⌁ focus";
  }
  if (focusBtn) {
    renderFocus();
    focusBtn.addEventListener("click", () => {
      focused = !focused;
      try { localStorage.setItem("focus", focused ? "1" : "0"); } catch (e) {}
      renderFocus();
      stopAudio();                     // entering focus silences him immediately
    });
  }

  // ----- interrupt: a new click always stops whatever is playing -----
  let currentAudio = null;
  function stopAudio() {
    try { if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch (e) {}
    if (currentAudio) {
      currentAudio.pause();
      try { currentAudio.currentTime = 0; } catch (e) {}
      currentAudio = null;
    }
  }

  function speak(text) {
    if (focused) return;                               // focus mode: silent pet
    if (clips[text]) {                                 // recorded clip ALWAYS wins
      currentAudio = clips[text];
      try { currentAudio.currentTime = 0; } catch (e) {}
      currentAudio.play().catch(() => {});             // never TTS over a recording
      return;
    }
    if (!("speechSynthesis" in window)) { giggle(); return; }
    try {
      const u = new SpeechSynthesisUtterance(
        text.replace(/[^\p{L}\p{M}\s!?'-]/gu, ""));   // strip emoji etc. before speaking
      if (kidVoice) u.voice = kidVoice;
      u.pitch = 2;                                     // max pitch → cartoon kid
      u.rate = 1.2 + Math.random() * 0.3;              // bouncy, a bit different each time
      u.volume = 0.9;
      speechSynthesis.speak(u);
    } catch (e) { giggle(); }
  }

  mascot.addEventListener("click", () => {
    stopAudio();                       // last click wins — cut off mid-banana
    mascot.classList.remove("jump");
    void mascot.offsetWidth;          // restart the animation
    mascot.classList.add("jump");
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    bubble.textContent = phrase;
    bubble.classList.add("show");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove("show"), 1600);
    speak(phrase);
  });
  mascot.addEventListener("animationend", e => {
    if (e.animationName === "mascot-jump") mascot.classList.remove("jump");
  });

  // ----- roaming: every so often he ROLLS along the bottom of the page.
  // Wheel physics: rotation angle = distance / circumference * 360, so his
  // body turns exactly as far as a wheel of his size would.
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const svgEl = mascot.querySelector("svg");
  let roamX = 0, rollDeg = 0;
  function roam() {
    if (reducedMotion.matches || document.hidden) { scheduleRoam(); return; }
    const range = Math.max(0, window.innerWidth - 140);
    const target = -Math.random() * range;             // 0 = home (right edge)
    const dx = target - roamX;
    if (Math.abs(dx) < 40) { scheduleRoam(); return; } // skip tiny shuffles
    const dur = Math.max(1.6, Math.abs(dx) / 130);     // ~130 px/s stroll
    rollDeg += (dx / (2 * Math.PI * 46)) * 360;        // wheel radius ≈ his half-height
    mascot.style.transition = `transform ${dur}s ease-in-out`;
    mascot.style.transform = `translateX(${target}px)`;
    svgEl.style.transition = `transform ${dur}s ease-in-out`;
    svgEl.style.transform = `rotate(${rollDeg}deg)`;
    roamX = target;
    scheduleRoam();
  }
  function scheduleRoam() { setTimeout(roam, 7000 + Math.random() * 9000); }
  scheduleRoam();
}

// Left sidebar (hamburger) + right TOC drawer
const sideNav = document.getElementById("side-nav");
const navOverlay = document.getElementById("nav-overlay");
const burger = document.getElementById("nav-burger");
if (burger && sideNav) {
  const setNav = open => {
    sideNav.classList.toggle("open", open);
    navOverlay.classList.toggle("show", open);
  };
  burger.addEventListener("click", () => setNav(!sideNav.classList.contains("open")));
  navOverlay.addEventListener("click", () => setNav(false));
  sideNav.addEventListener("click", e => {
    if (e.target.tagName === "A" && !document.body.classList.contains("nav-pinned")) setNav(false);
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") setNav(false); });
}
const tocDrawer = document.getElementById("toc-drawer");
if (tocDrawer) {
  document.getElementById("toc-tab").addEventListener("click", () =>
    tocDrawer.classList.toggle("open"));
  if (window.innerWidth >= 1100) tocDrawer.classList.add("open");  // open by default on desktop
}

// ---- GoatCounter event helper (no-op until analytics is configured) ----
function gcEvent(path) {
  try {
    if (window.goatcounter && goatcounter.count)
      goatcounter.count({ path: path, event: true });
  } catch (e) {}
}
function lsGet(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

// ---- content search (index built by Jekyll at /search.json) ----
// One engine, two boxes: sidebar + top-center of the screen.
let searchIdx = null;
async function ensureIndex() {
  if (!searchIdx) {
    try { searchIdx = await (await fetch("/search.json")).json(); }
    catch (e) { searchIdx = window.SEARCH_INDEX || []; }
  }
  return searchIdx;
}
function bindSearch(input, resultsEl) {
  if (!input || !resultsEl) return;
  input.addEventListener("input", async () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { resultsEl.innerHTML = ""; return; }
    const terms = q.split(/\s+/);
    const hits = (await ensureIndex()).filter(p => {
      const hay = (p.title + " " + (p.tags || []).join(" ") + " " + p.content).toLowerCase();
      return terms.every(t => hay.includes(t));
    }).slice(0, 8);
    resultsEl.innerHTML = hits.length
      ? hits.map(p => {
          const pos = p.content.toLowerCase().indexOf(terms[0]);
          const snip = pos >= 0
            ? "…" + p.content.slice(Math.max(0, pos - 30), pos + 70) + "…" : "";
          return '<a href="' + p.url + '"' + (p.route ? ' data-route="' + p.route + '"' : "") +
            '><strong>' + p.title + "</strong><small>" + p.date + " " + snip + "</small></a>";
        }).join("")
      : '<div class="search-none">no matches</div>';
  });
  document.addEventListener("click", e => {
    if (!resultsEl.contains(e.target) && e.target !== input) resultsEl.innerHTML = "";
  });
}
bindSearch(document.getElementById("site-search"), document.getElementById("search-results"));
bindSearch(document.getElementById("nav-search-input"), document.getElementById("nav-search-results"));

// ---- like / save buttons on posts ----
const actions = document.querySelector(".post-actions");
if (actions) {
  const path = actions.dataset.path, title = actions.dataset.title;
  const likeBtn = actions.querySelector(".act-like");
  const saveBtn = actions.querySelector(".act-save");
  const liked = () => lsGet("likedPosts", []).includes(path);
  const savedList = () => lsGet("savedPosts", []);
  const isSaved = () => savedList().some(p => p.path === path);
  function render() {
    likeBtn.classList.toggle("on", liked());
    likeBtn.querySelector("span").textContent = liked() ? "liked" : "like";
    saveBtn.classList.toggle("on", isSaved());
    saveBtn.querySelector("span").textContent = isSaved() ? "saved" : "save";
  }
  likeBtn.addEventListener("click", () => {
    let l = lsGet("likedPosts", []);
    if (liked()) l = l.filter(p => p !== path);
    else { l.push(path); gcEvent("like" + path); }   // owner sees totals in GoatCounter
    lsSet("likedPosts", l); render();
  });
  saveBtn.addEventListener("click", () => {
    let s = savedList();
    if (isSaved()) s = s.filter(p => p.path !== path);
    else s.push({ path: path, title: title });
    lsSet("savedPosts", s); render();
  });
  render();

  // ---- citation: APA + BibTeX popover with copy buttons ----
  const citeBtn = actions.querySelector(".act-cite");
  const citePop = document.getElementById("cite-pop");
  if (citeBtn && citePop) {
    const year = actions.dataset.year || new Date().getFullYear();
    const url = location.href.split("#")[0];
    const slug = path.replace(/[^\w]+/g, "").slice(0, 24) || "post";
    document.getElementById("cite-apa").textContent =
      "Srivastava, T. (" + year + "). " + title + ". tanya-sriv.github.io. " + url;
    document.getElementById("cite-bib").textContent =
      "@misc{srivastava" + year + slug + ",\n  author = {Srivastava, Tanya},\n" +
      "  title = {" + title + "},\n  year = {" + year + "},\n" +
      "  howpublished = {\\url{" + url + "}}\n}";
    citeBtn.addEventListener("click", () => { citePop.hidden = !citePop.hidden; });
    citePop.querySelectorAll(".cite-copy").forEach(b => b.addEventListener("click", () => {
      navigator.clipboard.writeText(document.getElementById(b.dataset.for).textContent)
        .then(() => { b.textContent = "copied!"; setTimeout(() => b.textContent = "copy", 1300); });
    }));
  }

  // ---- PDF: direct file download (html2pdf) with watermark + citation;
  //      falls back to print-to-PDF if the library isn't available ----
  const pdfBtn = actions.querySelector(".act-pdf");
  if (pdfBtn) pdfBtn.addEventListener("click", () => {
    gcEvent("pdf" + path);
    const art = document.querySelector("article.post");
    if (window.html2pdf && art) {
      const clone = art.cloneNode(true);
      clone.querySelectorAll(".post-actions,.cite-pop,.print-watermark,pre .copy-btn")
        .forEach(n => n.remove());
      const cp = clone.querySelector(".print-copyright");
      if (cp) cp.style.cssText = "display:block;margin-top:3em;padding-top:1em;border-top:1px solid #bbb;font-size:.78rem;color:#555";
      const wrap = document.createElement("div");
      wrap.style.cssText = "position:relative;background:#fff;color:#1c1e21;padding:28px;width:700px;font-family:Georgia,serif";
      wrap.appendChild(clone);
      document.body.appendChild(wrap);                 // must be in DOM to measure
      const h = Math.max(wrap.scrollHeight, 1000);
      for (let y = 300; y < h; y += 850) {             // watermark roughly once per page
        const wm = document.createElement("div");
        wm.textContent = "© Tanya Srivastava · tanya-sriv.github.io";
        wm.style.cssText = "position:absolute;left:0;right:0;top:" + y +
          "px;text-align:center;transform:rotate(-28deg);font-size:26px;" +
          "color:rgba(0,0,0,.10);pointer-events:none;font-family:monospace";
        wrap.appendChild(wm);
      }
      const fname = (title || "post").toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") + ".pdf";
      html2pdf().set({
        margin: [12, 12], filename: fname,
        html2canvas: { scale: 2 }, jsPDF: { unit: "mm", format: "a4" }
      }).from(wrap).save().then(() => wrap.remove()).catch(() => { wrap.remove(); window.print(); });
    } else {
      window.print();      // print stylesheet adds watermark + copyright + citation
    }
  });

  // ---- read counter: fires once when the reader reaches ~85% of the article ----
  const art = document.querySelector("article.post");
  if (art) {
    let readSent = false;
    try { readSent = sessionStorage.getItem("read" + path) === "1"; } catch (e) {}
    window.addEventListener("scroll", function onScroll() {
      if (readSent) return;
      const r = art.getBoundingClientRect();
      const done = (window.innerHeight - r.top) / r.height;
      if (done >= 0.85) {
        readSent = true;
        try { sessionStorage.setItem("read" + path, "1"); } catch (e) {}
        gcEvent("read" + path);
        window.removeEventListener("scroll", onScroll);
      }
    });
  }
}

// ---- saved-posts page ----
const savedListEl = document.getElementById("saved-list");
if (savedListEl) {
  const saved = lsGet("savedPosts", []);
  const empty = document.getElementById("saved-empty");
  if (saved.length) {
    empty.style.display = "none";
    savedListEl.innerHTML = saved.map(p =>
      '<li><h3><a href="' + p.path + '"' + (p.route ? ' data-route="' + p.route + '"' : "") +
      '>' + p.title + "</a></h3></li>").join("");
  }
}

// Copy buttons on code blocks
document.querySelectorAll("article.post pre").forEach(pre => {
  const btn = document.createElement("button");
  btn.className = "copy-btn";
  btn.textContent = "copy";
  btn.addEventListener("click", () => {
    navigator.clipboard.writeText(pre.querySelector("code").innerText).then(() => {
      btn.textContent = "copied!";
      btn.classList.add("copied");
      setTimeout(() => { btn.textContent = "copy"; btn.classList.remove("copied"); }, 1400);
    });
  });
  pre.appendChild(btn);
});

// TOC scroll-spy: highlight the section currently in view
const tocLinks = document.querySelectorAll(".toc a");
if (tocLinks.length) {
  const map = new Map();
  tocLinks.forEach(a => {
    const id = decodeURIComponent(a.getAttribute("href").slice(1));
    const h = document.getElementById(id);
    if (h) map.set(h, a);
  });
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        tocLinks.forEach(a => a.classList.remove("active"));
        map.get(e.target)?.classList.add("active");
      }
    });
  }, { rootMargin: "0px 0px -70% 0px" });
  map.forEach((_, h) => obs.observe(h));
}
