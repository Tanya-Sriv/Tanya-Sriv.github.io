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

  // ----- ribbon (Word-style) -----
  document.querySelectorAll(".ed-ribbon [data-x]").forEach(btn =>
    btn.addEventListener("mousedown", e => {
      e.preventDefault();                              // keep selection
      document.execCommand(btn.dataset.x, false, null);
    }));
  const blockSel = document.getElementById("rb-block");
  if (blockSel) blockSel.addEventListener("change", () => {
    visual.focus();
    document.execCommand("formatBlock", false, blockSel.value);
    blockSel.blur();
  });
  document.querySelectorAll(".ed-ribbon [data-fore]").forEach(btn =>
    btn.addEventListener("mousedown", e => {
      e.preventDefault();
      document.execCommand("foreColor", false, btn.dataset.fore);
    }));
  document.querySelectorAll(".ed-ribbon [data-hilite]").forEach(btn =>
    btn.addEventListener("mousedown", e => {
      e.preventDefault();
      document.execCommand("hiliteColor", false, btn.dataset.hilite);
    }));
  const rbLink = document.getElementById("rb-link");
  if (rbLink) rbLink.addEventListener("mousedown", e => {
    e.preventDefault();
    const url = prompt("Link URL:", "https://");
    if (url) document.execCommand("createLink", false, url);
  });
  const rbCode = document.getElementById("rb-inlinecode");
  if (rbCode) rbCode.addEventListener("mousedown", e => {
    e.preventDefault();
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) {
      try {
        const r = sel.getRangeAt(0), c = document.createElement("code");
        r.surroundContents(c);
      } catch (err) { /* selection crosses elements — skip */ }
    }
  });

  // ----- import from Medium (paste-based; browsers block cross-site fetch) -----
  const impModal = document.getElementById("imp-modal");
  const impPaste = document.getElementById("imp-paste");
  function cleanMediumHTML(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    tmp.querySelectorAll("script,style,button,svg,nav,header,footer,form,input").forEach(n => n.remove());
    // unwrap layout containers Medium wraps everything in
    let changed = true;
    while (changed) {
      changed = false;
      tmp.querySelectorAll("div,section,article,span,figure,main").forEach(n => {
        n.replaceWith(...n.childNodes); changed = true;
      });
    }
    // headings: Medium's h1 = title, h3/h4 = sections
    tmp.querySelectorAll("h1").forEach(n => {
      const h = document.createElement("h2"); h.innerHTML = n.innerHTML; n.replaceWith(h);
    });
    // strip all attributes except the ones that matter
    tmp.querySelectorAll("*").forEach(n => {
      [...n.attributes].forEach(a => {
        if (!["href", "src", "alt", "controls", "width", "height", "allowfullscreen", "frameborder"].includes(a.name))
          n.removeAttribute(a.name);
      });
    });
    // drop empty paragraphs
    tmp.querySelectorAll("p").forEach(n => { if (!n.textContent.trim() && !n.querySelector("img")) n.remove(); });
    return tmp;
  }
  const impBtn = document.getElementById("ed-import");
  if (impBtn) impBtn.addEventListener("click", () => { impModal.hidden = false; impPaste.focus(); });
  document.getElementById("imp-cancel").addEventListener("click", () => {
    impModal.hidden = true; impPaste.innerHTML = "";
  });
  document.getElementById("imp-go").addEventListener("click", () => {
    const cleaned = cleanMediumHTML(impPaste.innerHTML);
    const firstH = cleaned.querySelector("h2,h3");
    if (firstH && !titleEl.value) { titleEl.value = firstH.textContent.trim(); firstH.remove(); }
    visual.innerHTML = cleaned.innerHTML.trim() || visual.innerHTML;
    impModal.hidden = true; impPaste.innerHTML = "";
    setMode("visual");
  });

  // ----- image insertion: URL / local file / snip+paste / drag-drop -----
  const imgModal = document.getElementById("img-modal");
  let savedRange = null;
  function saveCaret() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && visual.contains(sel.anchorNode))
      savedRange = sel.getRangeAt(0).cloneRange();
  }
  function insertImage(src) {
    visual.focus();
    if (savedRange) {
      const sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(savedRange);
    }
    document.execCommand("insertHTML", false,
      '<img src="' + src + '" alt="image" style="max-width:100%">');
    if (imgModal) imgModal.hidden = true;
  }
  function fileToImage(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = () => insertImage(r.result);
    r.readAsDataURL(file);
  }
  const rbImg = document.getElementById("rb-img");
  if (rbImg) {
    rbImg.addEventListener("click", () => { saveCaret(); imgModal.hidden = false; });
    document.getElementById("img-cancel").addEventListener("click", () => imgModal.hidden = true);
    document.getElementById("img-url-go").addEventListener("click", () => {
      const u = document.getElementById("img-url").value.trim();
      if (u) insertImage(u);
    });
    const drop = document.getElementById("img-drop");
    const fileInput = document.getElementById("img-file");
    drop.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => fileToImage(fileInput.files[0]));
    drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("over"); });
    drop.addEventListener("dragleave", () => drop.classList.remove("over"));
    drop.addEventListener("drop", e => {
      e.preventDefault(); drop.classList.remove("over");
      fileToImage(e.dataTransfer.files[0]);
    });
    const pasteZone = document.getElementById("img-paste");
    pasteZone.addEventListener("paste", e => {
      for (const item of e.clipboardData.items)
        if (item.type.startsWith("image/")) { e.preventDefault(); fileToImage(item.getAsFile()); return; }
    });
  }
  // paste a screenshot straight into the text — no dialog needed
  visual.addEventListener("paste", e => {
    for (const item of e.clipboardData.items)
      if (item.type.startsWith("image/")) {
        e.preventDefault(); saveCaret(); fileToImage(item.getAsFile()); return;
      }
  });
  // drag an image file straight onto the page
  visual.addEventListener("dragover", e => {
    if ([...e.dataTransfer.types].includes("Files")) e.preventDefault();
  });
  visual.addEventListener("drop", e => {
    if (!e.dataTransfer.files.length) return;         // native image move: let it be
    e.preventDefault();
    const range = document.caretRangeFromPoint
      ? document.caretRangeFromPoint(e.clientX, e.clientY) : null;
    if (range) savedRange = range;
    fileToImage(e.dataTransfer.files[0]);
  });

  // ----- click an image → resize frame with corner handles; drag img to move -----
  const rz = document.getElementById("img-resizer");
  let rzImg = null;
  function placeResizer() {
    if (!rzImg || !document.contains(rzImg)) { hideResizer(); return; }
    const r = rzImg.getBoundingClientRect();
    rz.style.left = (r.left + window.scrollX - 2) + "px";
    rz.style.top = (r.top + window.scrollY - 2) + "px";
    rz.style.width = r.width + "px";
    rz.style.height = r.height + "px";
  }
  function showResizer(img) { rzImg = img; rz.hidden = false; placeResizer(); }
  function hideResizer() { rzImg = null; rz.hidden = true; }
  visual.addEventListener("click", e => {
    if (e.target.tagName === "IMG") { showResizer(e.target); e.preventDefault(); }
    else hideResizer();
  });
  document.addEventListener("scroll", placeResizer, true);
  window.addEventListener("resize", placeResizer);
  visual.addEventListener("input", () => setTimeout(placeResizer, 1));
  if (rz) rz.querySelectorAll(".rz").forEach(h =>
    h.addEventListener("pointerdown", e => {
      if (!rzImg) return;
      e.preventDefault();
      const startX = e.clientX, startW = rzImg.getBoundingClientRect().width;
      const fromLeft = h.dataset.c === "nw" || h.dataset.c === "sw";
      function move(ev) {
        const dx = ev.clientX - startX;
        const w = Math.max(48, fromLeft ? startW - dx : startW + dx);
        rzImg.style.width = w + "px";
        rzImg.style.height = "auto";
        placeResizer();
      }
      function up() {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
      }
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
    }));

  // ----- drawing tool -----
  const drawModal = document.getElementById("draw-modal");
  const canvas = document.getElementById("dr-canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    let dColor = "#1c1e21", dSize = 3, erasing = false, drawing = false, undoStack = [];
    function resetCanvas() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);   // transparent, not white
    }
    resetCanvas();
    function pos(e) {
      const r = canvas.getBoundingClientRect();
      return [(e.clientX - r.left) * canvas.width / r.width,
              (e.clientY - r.top) * canvas.height / r.height];
    }
    canvas.addEventListener("pointerdown", e => {
      undoStack.push(canvas.toDataURL());
      if (undoStack.length > 25) undoStack.shift();
      drawing = true;
      ctx.beginPath(); ctx.moveTo(...pos(e));
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", e => {
      if (!drawing) return;
      ctx.lineTo(...pos(e));
      ctx.globalCompositeOperation = erasing ? "destination-out" : "source-over";
      ctx.strokeStyle = erasing ? "rgba(0,0,0,1)" : dColor;
      ctx.lineWidth = erasing ? dSize * 3 : dSize;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.stroke();
    });
    canvas.addEventListener("pointerup", () => { drawing = false; });
    document.querySelectorAll(".dr-color").forEach(b => b.addEventListener("click", () => {
      dColor = b.dataset.dcolor; erasing = false;
      document.querySelectorAll(".dr-color").forEach(x => x.classList.toggle("on", x === b));
      document.getElementById("dr-eraser").classList.remove("on");
    }));
    document.querySelectorAll(".dr-size").forEach(b => b.addEventListener("click", () => {
      dSize = +b.dataset.dsize;
      document.querySelectorAll(".dr-size").forEach(x => x.classList.toggle("on", x === b));
    }));
    document.getElementById("dr-eraser").addEventListener("click", function () {
      erasing = !erasing; this.classList.toggle("on", erasing);
    });
    document.getElementById("dr-undo").addEventListener("click", () => {
      if (!undoStack.length) return;
      const img = new Image();
      img.onload = () => {
        ctx.globalCompositeOperation = "source-over";
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = undoStack.pop();
    });
    document.getElementById("dr-clear").addEventListener("click", () => {
      undoStack.push(canvas.toDataURL()); resetCanvas();
    });
    document.getElementById("rb-draw").addEventListener("click", () => { drawModal.hidden = false; });
    document.getElementById("dr-cancel").addEventListener("click", () => { drawModal.hidden = true; });
    document.getElementById("dr-insert").addEventListener("click", () => {
      const url = canvas.toDataURL("image/png");
      drawModal.hidden = true;
      visual.focus();
      document.execCommand("insertHTML", false,
        '<img src="' + url + '" alt="drawing" style="max-width:100%">');
    });
  }

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
  // ----- edit mode: /post/?edit=_posts/... loads an existing post -----
  let editPath = null, editFM = null;
  async function loadForEdit(path) {
    try {
      const res = await fetch("https://raw.githubusercontent.com/Tanya-Sriv/Tanya-Sriv.github.io/main/" +
        path + "?t=" + Date.now());
      if (!res.ok) throw new Error(res.status);
      const text = await res.text();
      const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
      if (!m) throw new Error("no front matter");
      editPath = path; editFM = m[0];
      const fm = m[1], body = text.slice(m[0].length).trim();
      const tm = fm.match(/^title:\s*"?(.*?)"?\s*$/m);
      if (tm) titleEl.value = tm[1].replace(/\\"/g, '"');
      const gm = fm.match(/^tags:\s*\[(.*)\]/m);
      if (gm) tagsEl.value = gm[1];
      titleEl.disabled = false;
      if (/^</.test(body)) {                     // HTML body (visual/imported) → visual mode
        setMode("visual"); visual.innerHTML = body;
      } else {                                    // markdown body → markdown mode
        setMode("md"); ta.value = body; render();
      }
      const btn = document.getElementById("ed-github");
      if (btn) btn.textContent = "update →";
      document.title = "Editing: " + (titleEl.value || path);
    } catch (e) {
      alert("Couldn't load post for editing (" + e.message + ") — it may have just been created; try again in a minute.");
    }
  }
  const editParam = new URLSearchParams(location.search).get("edit");
  if (editParam && /^_posts\/[\w.\-]+$/.test(editParam)) loadForEdit(editParam);

  function fullPost() {
    const tags = (tagsEl.value || "").split(",").map(t => t.trim()).filter(Boolean);
    // Visual mode publishes its HTML directly — kramdown passes raw HTML
    // through untouched, so what you see is exactly what ships.
    const body = mode === "visual" ? visual.innerHTML.trim() : ta.value;
    if (editPath && editFM) {
      // preserve the original front matter (date, medium_url, canonical…);
      // update only title and tags
      let fm = editFM.replace(/^title:.*$/m,
        'title: "' + (titleEl.value || "Untitled").replace(/"/g, '\\"') + '"');
      if (/^tags:/m.test(fm)) fm = fm.replace(/^tags:.*$/m, "tags: [" + tags.join(", ") + "]");
      return fm + "\n" + body + "\n";
    }
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
  // ----- direct publishing via GitHub API (any size, images extracted) -----
  const GH_REPO = "Tanya-Sriv/Tanya-Sriv.github.io";
  function ghToken() { try { return localStorage.getItem("gh_token") || ""; } catch (e) { return ""; } }
  const tokenBtn = document.getElementById("ed-token");
  if (tokenBtn) tokenBtn.addEventListener("click", () => {
    const cur = ghToken();
    const t = prompt(
      "Direct publishing setup (one-time).\n\n" +
      "Paste a fine-grained GitHub token scoped to ONLY this repo with " +
      "Contents: Read & write (GitHub → Settings → Developer settings → " +
      "Fine-grained tokens).\n\nStored only in THIS browser. " +
      (cur ? "A token is currently saved — paste a new one, or clear the box and OK to remove it." : ""),
      cur ? "(saved)" : "");
    if (t === null) return;
    try {
      if (t.trim() && t !== "(saved)") { localStorage.setItem("gh_token", t.trim()); alert("Saved — publish → now commits directly."); }
      else if (!t.trim()) { localStorage.removeItem("gh_token"); alert("Token removed — publish falls back to GitHub's editor."); }
    } catch (e) { alert("Could not access browser storage."); }
  });

  function b64utf8(str) { return btoa(unescape(encodeURIComponent(str))); }
  async function ghPut(path, contentB64, message, token) {
    const api = "https://api.github.com/repos/" + GH_REPO + "/contents/" + path;
    const headers = { "Authorization": "Bearer " + token, "Accept": "application/vnd.github+json" };
    let sha;
    const probe = await fetch(api, { headers });
    if (probe.status === 200) sha = (await probe.json()).sha;   // updating an existing file
    const body = { message, content: contentB64 };
    if (sha) body.sha = sha;
    const res = await fetch(api, { method: "PUT", headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(path + " → " + res.status + " " + (await res.text()).slice(0, 160));
  }

  async function apiPublish(token) {
    const btn = document.getElementById("ed-github");
    btn.disabled = true; btn.textContent = "publishing…";
    try {
      let body = fullPost();
      // extract embedded data-URL images into real files (smaller posts, faster pages)
      const imgs = [...body.matchAll(/"(data:image\/(png|jpe?g|gif|webp);base64,([A-Za-z0-9+/=]+))"/g)];
      let n = 0;
      for (const m of imgs) {
        n++;
        const ext = m[2] === "jpeg" ? "jpg" : m[2];
        const base = (editPath ? editPath.split("/").pop() : fileName()).replace(/\.md$/, "");
        const path = "assets/images/" + base + "-" + n + "." + ext;
        btn.textContent = "uploading image " + n + "/" + imgs.length + "…";
        await ghPut(path, m[3], "chore: add image for " + slug(), token);
        body = body.split(m[1]).join("/" + path);
      }
      btn.textContent = editPath ? "updating post…" : "committing post…";
      const target = editPath || ("_posts/" + fileName());
      await ghPut(target, b64utf8(body), (editPath ? "post: update " : "post: ") + (titleEl.value || "untitled"), token);
      btn.textContent = editPath ? "updated ✓" : "published ✓";
      setTimeout(() => { btn.textContent = editPath ? "update →" : "publish →"; btn.disabled = false; }, 2500);
      alert("Published! The site rebuilds in ~1 minute:\nhttps://tanya-sriv.github.io/blog/\n\n(Images extracted: " + imgs.length + ")");
    } catch (e) {
      btn.textContent = "publish →"; btn.disabled = false;
      alert("Publish failed: " + e.message + "\n\nCheck the token (⚙) — it may have expired or lack Contents write access. 'download .md' always works as backup.");
    }
  }

  const gh = document.getElementById("ed-github");
  if (gh) gh.addEventListener("click", () => {
    const token = ghToken();
    if (token) { apiPublish(token); return; }
    // fallback: GitHub's pre-filled new-file editor (URL-size limited)
    const base = "https://github.com/" + GH_REPO + "/new/main/_posts";
    const url = base + "?filename=" + encodeURIComponent(fileName()) +
      "&value=" + encodeURIComponent(fullPost());
    if (url.length > 7500) {
      alert("Post is too big for the no-token fallback (images count as text!).\n\nEither set up direct publishing (⚙ button, one-time token) — recommended — or use 'download .md' and drop the file into _posts/ on GitHub.");
      return;
    }
    window.open(url, "_blank");
  });
})();
