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

// Mascot: click (or tap) to jump
const mascot = document.getElementById("mascot");
if (mascot) {
  mascot.addEventListener("click", () => {
    mascot.classList.remove("jump");
    void mascot.offsetWidth;          // restart the animation
    mascot.classList.add("jump");
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
