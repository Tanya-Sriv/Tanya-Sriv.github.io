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
