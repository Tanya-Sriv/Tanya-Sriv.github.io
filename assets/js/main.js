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

  function speak(text) {
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
