"""Sync Medium posts as NATIVE blog posts (full content) + hub data file.
Runs daily via GitHub Actions. Stdlib only.

- New Medium posts become real files in _posts/ (full article HTML,
  editorial layout, TOC, likes, PDF - everything native posts get).
- Existing files are never overwritten, so local edits are safe.
- canonical_url points at Medium for imported posts (honest SEO: Medium
  published them first). Posts written on-site first stay canonical here.
"""
import json, re, sys, urllib.request, xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from html import unescape
from pathlib import Path

cfg = Path("_config.yml").read_text(encoding="utf-8")
m = re.search(r'^medium:\s*"?(https?://medium\.com/(@[\w.-]+))"?', cfg, re.M)
if not m:
    print("No medium: URL in _config.yml - nothing to sync."); sys.exit(0)
handle = m.group(2)

req = urllib.request.Request(f"https://medium.com/feed/{handle}",
                             headers={"User-Agent": "Mozilla/5.0 (site-sync)"})
root = ET.fromstring(urllib.request.urlopen(req, timeout=30).read())

def strip_html(s):
    return re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()

def slugify(t):
    return re.sub(r"^-|-$", "", re.sub(r"[^\w]+", "-", t.lower()))[:60]

posts_dir = Path("_posts"); posts_dir.mkdir(exist_ok=True)
existing = " ".join(p.name for p in posts_dir.glob("*"))
hub, created = [], 0

for item in root.iter("item"):
    title = (item.findtext("title") or "").strip()
    link = (item.findtext("link") or "").split("?")[0]
    tags = [c.text for c in item.findall("category") if c.text]
    content = item.findtext("{http://purl.org/rss/1.0/modules/content/}encoded") \
              or item.findtext("description") or ""
    # drop Medium's tracking pixel
    content = re.sub(r'<img[^>]+medium\.com/_/stat[^>]*>', "", content)
    try:
        dt = parsedate_to_datetime(item.findtext("pubDate"))
        date_str, date_full = dt.strftime("%Y-%m-%d"), dt.strftime("%Y-%m-%d %H:%M:%S %z")
    except Exception:
        continue
    img = re.search(r'<img[^>]+src="([^"]+)"', content)
    hub.append({"title": title, "url": link, "date": dt.strftime("%b %d, %Y"),
                "tags": tags[:4], "snippet": strip_html(content)[:220],
                "image": img.group(1) if img else ""})

    slug = slugify(title)
    if slug and slug not in existing:          # never overwrite, never duplicate
        safe_title = title.replace('"', '\\"')
        fm = (f'---\nlayout: post\ntitle: "{safe_title}"\ndate: {date_full}\n'
              f'tags: [{", ".join(tags[:4])}]\nmedium_url: {link}\n'
              f'canonical_url: {link}\n---\n\n{content}\n')
        (posts_dir / f"{date_str}-{slug}.md").write_text(fm, encoding="utf-8")
        created += 1
        print(f"imported: {date_str}-{slug}.md")

Path("_data").mkdir(exist_ok=True)
new = json.dumps({"handle": handle, "posts": hub}, indent=2, ensure_ascii=False)
data = Path("_data/medium.json")
changed = not data.exists() or data.read_text(encoding="utf-8") != new
if changed: data.write_text(new, encoding="utf-8")
print(f"{len(hub)} posts in feed, {created} newly imported, hub {'updated' if changed else 'unchanged'}.")
