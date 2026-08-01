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
