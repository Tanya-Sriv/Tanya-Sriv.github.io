/* /post editor: markdown in, live blog-styled preview out, publish via GitHub.
   Includes a small dependency-free markdown renderer approximating kramdown
   (the real rendering happens when Jekyll builds the post). */

/* ---------- mini markdown renderer ---------- */
function mdEscape(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function mdInline(s, notes) {
  s = mdEscape(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2">');
  s = s.replace(/\[\^([^\]]+)\](?!:)/g, (m, id) => {
    notes.refs.push(id);
    return `<sup id="fnref-${id}"><a href="#fn-${id}">${notes.refs.length}</a></sup>`;
  });
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  return s;
}
function mdRender(src) {
  const notes = { refs: [], defs: {} };
  const lines = src.replace(/\r/g, "").split("\n");
  const out = [];
  let i = 0;

  function listBlock(indent) {
    let html = "", type = null, items = [];
    const re = new RegExp("^" + " ".repeat(indent) + "([-*]|\\d+\\.)\\s+(.*)$");
    while (i < lines.length) {
      const m = lines[i].match(re);
      const deeper = lines[i].match(new RegExp("^" + " ".repeat(indent + 2) + "([-*]|\\d+\\.)\\s+"));
      if (m && !deeper) {
        type = type || (/[-*]/.test(m[1]) ? "ul" : "ol");
        items.push({ text: m[2], sub: "" });
        i++;
      } else if (deeper && items.length) {
        items[items.length - 1].sub += listBlock(indent + 2);
      } else break;
    }
    if (!items.length) return "";
    html = `<${type}>` + items.map(it =>
      `<li>${mdInline(it.text, notes)}${it.sub}</li>`).join("") + `</${type}>`;
    return html;
  }

  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }

    let m;
    if ((m = line.match(/^```(\w*)/))) {                       // fenced code
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre><code class="lang-${m[1]}">${mdEscape(buf.join("\n"))}</code></pre>`);
    } else if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {        // headings
      const level = m[1].length;
      const id = m[2].toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
      out.push(`<h${level} id="${id}">${mdInline(m[2], notes)}</h${level}>`);
      i++;
    } else if (/^(-{3,}|\*{3,})\s*$/.test(line)) {             // hr
      out.push("<hr>"); i++;
    } else if ((m = line.match(/^\[\^([^\]]+)\]:\s+(.*)$/))) { // footnote def
      notes.defs[m[1]] = m[2]; i++;
    } else if (/^>/.test(line)) {                              // blockquote
      const buf = [];
      while (i < lines.length && /^>/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
      out.push(`<blockquote>${mdInline(buf.join(" "), notes)}</blockquote>`);
    } else if (/^\|/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || "")) { // table
      const header = line.split("|").slice(1, -1).map(c => c.trim());
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i]))
        rows.push(lines[i++].split("|").slice(1, -1).map(c => c.trim()));
      out.push("<table><thead><tr>" +
        header.map(h => `<th>${mdInline(h, notes)}</th>`).join("") +
        "</tr></thead><tbody>" +
        rows.map(r => "<tr>" + r.map(c => `<td>${mdInline(c, notes)}</td>`).join("") + "</tr>").join("") +
        "</tbody></table>");
    } else if (/^([-*]|\d+\.)\s+/.test(line)) {                // lists (nested)
      out.push(listBlock(0));
    } else if (/^<.+>/.test(line.trim())) {                    // raw HTML (video embeds etc.)
      const buf = [];
      while (i < lines.length && lines[i].trim() !== "") buf.push(lines[i++]);
      out.push(buf.join("\n"));
    } else {                                                   // paragraph
      const buf = [];
      while (i < lines.length && lines[i].trim() !== "" &&
             !/^(#{1,6}\s|```|>|\||([-*]|\d+\.)\s|\[\^)/.test(lines[i])) buf.push(lines[i++]);
      if (!buf.length) { buf.push(lines[i]); i++; }            // guard: always advance
      out.push(`<p>${mdInline(buf.join(" "), notes)}</p>`);
    }
  }

  if (notes.refs.length) {
    out.push('<div class="footnotes"><ol>' + notes.refs.map(id =>
      `<li id="fn-${id}">${mdInline(notes.defs[id] || "", notes)} <a href="#fnref-${id}">↩</a></li>`
    ).join("") + "</ol></div>");
  }
  return out.join("\n");
}

/* ---------- editor wiring ---------- */
(function () {
  const ta = document.getElementById("ed-src");
  if (!ta) return;
  const preview = document.getElementById("ed-preview");
  const titleEl = document.getElementById("ed-title");
  const tagsEl = document.getElementById("ed-tags");
  const visual = document.getElementById("ed-visual");
  const visualWrap = document.getElementById("ed-visual-wrap");
  const mdWrap = document.getElementById("ed-md-wrap");
  const bubble = document.getElementById("ed-bubble");
  let mode = "visual";

  // ----- mode tabs -----
  const mv = document.getElementById("mode-visual"), mm = document.getElementById("mode-md");
  function setMode(m) {
    mode = m;
    visualWrap.style.display = m === "visual" ? "" : "none";
    mdWrap.style.display = m === "md" ? "" : "none";
    mv.classList.toggle("on", m === "visual");
    mm.classList.toggle("on", m === "md");
    hideBubble();
  }
  mv.addEventListener("click", () => setMode("visual"));
  mm.addEventListener("click", () => setMode("md"));

  // ----- Medium-style floating bubble on selection (visual mode) -----
  function hideBubble() { bubble.hidden = true; }
  function showBubble() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !visual.contains(sel.anchorNode)) { hideBubble(); return; }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (!rect.width) { hideBubble(); return; }
    bubble.hidden = false;
    const bw = bubble.offsetWidth;
    bubble.style.left = Math.max(8, rect.left + rect.width / 2 - bw / 2 + window.scrollX) + "px";
    bubble.style.top = (rect.top + window.scrollY - bubble.offsetHeight - 10) + "px";
  }
  document.addEventListener("mouseup", () => setTimeout(showBubble, 1));
  document.addEventListener("keyup", e => {
    if (visual.contains(document.activeElement) || document.activeElement === visual)
      setTimeout(showBubble, 1);
  });
  visual.addEventListener("blur", () => setTimeout(() => {
    if (!bubble.contains(document.activeElement)) hideBubble();
  }, 150));

  bubble.querySelectorAll("[data-cmd]").forEach(btn =>
    btn.addEventListener("mousedown", e => {
      e.preventDefault();                       // keep the selection alive
      const cmd = btn.dataset.cmd;
      if (cmd === "link") {
        const url = prompt("Link URL:", "https://");
        if (url) document.execCommand("createLink", false, url);
      } else if (cmd === "h2" || cmd === "h3") {
        document.execCommand("formatBlock", false, cmd.toUpperCase());
      } else if (cmd === "quote") {
        document.execCommand("formatBlock", false, "BLOCKQUOTE");
      } else if (cmd === "p") {
        document.execCommand("formatBlock", false, "P");
      } else {
        document.execCommand(cmd, false, null);
      }
      setTimeout(showBubble, 1);
    }));

  // ----- block inserts (visual mode) -----
  document.querySelectorAll("[data-vins]").forEach(btn =>
    btn.addEventListener("click", () => {
      visual.focus();
      document.execCommand("insertHTML", false, btn.dataset.vins);
    }));

  function insert(snippet, wrapEnd) {
    const s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
    const sel = v.slice(s, e);
    const text = wrapEnd ? snippet + (sel || "text") + wrapEnd : snippet;
    ta.value = v.slice(0, s) + text + v.slice(e);
    ta.focus();
    ta.selectionStart = ta.selectionEnd = s + text.length;
    render();
  }
  document.querySelectorAll("[data-ins]").forEach(btn =>
    btn.addEventListener("click", () => {
      const [a, b] = JSON.parse(btn.dataset.ins);
      insert(a.replace(/\\n/g, "\n"), b);
    }));

  function render() { preview.innerHTML = mdRender(ta.value); }
  ta.addEventListener("input", render);
  render();

  function slug() {
    return (titleEl.value || "untitled").toLowerCase()
      .replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
  }
  function fileDate() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
  function fileName() { return fileDate() + "-" + slug() + ".md"; }
  function fullPost() {
    const tags = (tagsEl.value || "").split(",").map(t => t.trim()).filter(Boolean);
    // Visual mode publishes its HTML directly — kramdown passes raw HTML
    // through untouched, so what you see is exactly what ships.
    const body = mode === "visual" ? visual.innerHTML.trim() : ta.value;
    return "---\nlayout: post\ntitle: \"" + (titleEl.value || "Untitled").replace(/"/g, '\\"') +
      "\"\ntags: [" + tags.join(", ") + "]\n---\n\n" + body + "\n";
  }

  document.getElementById("ed-copy").addEventListener("click", function () {
    navigator.clipboard.writeText(fullPost()).then(() => {
      this.textContent = "copied!"; setTimeout(() => this.textContent = "copy .md", 1400);
    });
  });
  document.getElementById("ed-download").addEventListener("click", () => {
    const blob = new Blob([fullPost()], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName();
    a.click();
    URL.revokeObjectURL(a.href);
  });
  const gh = document.getElementById("ed-github");
  if (gh) gh.addEventListener("click", () => {
    const base = "https://github.com/Tanya-Sriv/Tanya-Sriv.github.io/new/main/_posts";
    const url = base + "?filename=" + encodeURIComponent(fileName()) +
      "&value=" + encodeURIComponent(fullPost());
    if (url.length > 7500) {
      alert("Post is too long for URL prefill — use 'download .md' and drag the file into GitHub instead.");
      return;
    }
    window.open(url, "_blank");
  });
})();
