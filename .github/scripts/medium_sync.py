"""Fetch Medium RSS feed and write _data/medium.json for the /medium/ hub page.
Runs daily via GitHub Actions. Stdlib only - no dependencies."""
import json, re, sys, urllib.request, xml.etree.ElementTree as ET
from html import unescape
from pathlib import Path

# Medium handle comes from _config.yml's medium: URL (e.g. https://medium.com/@tanya-sriv)
cfg = Path("_config.yml").read_text(encoding="utf-8")
m = re.search(r'^medium:\s*"?(https?://medium\.com/(@[\w.-]+))"?', cfg, re.M)
if not m:
    print("No medium: URL set in _config.yml - nothing to sync."); sys.exit(0)
handle = m.group(2)
feed_url = f"https://medium.com/feed/{handle}"

req = urllib.request.Request(feed_url, headers={"User-Agent": "Mozilla/5.0 (site-sync)"})
xml_data = urllib.request.urlopen(req, timeout=30).read()
root = ET.fromstring(xml_data)

def strip_html(s):
    s = re.sub(r"<[^>]+>", " ", s or "")
    return re.sub(r"\s+", " ", unescape(s)).strip()

posts = []
for item in root.iter("item"):
    title = (item.findtext("title") or "").strip()
    link = (item.findtext("link") or "").split("?")[0]
    pub = (item.findtext("pubDate") or "")[:16]          # e.g. "Mon, 21 Jul 2026"
    tags = [c.text for c in item.findall("category") if c.text]
    content = item.findtext("{http://purl.org/rss/1.0/modules/content/}encoded") or item.findtext("description") or ""
    img = re.search(r'<img[^>]+src="([^"]+)"', content)
    posts.append({
        "title": title, "url": link, "date": pub, "tags": tags[:4],
        "snippet": strip_html(content)[:220],
        "image": img.group(1) if img else "",
    })

out = Path("_data/medium.json")
out.parent.mkdir(exist_ok=True)
new = json.dumps({"handle": handle, "posts": posts}, indent=2, ensure_ascii=False)
if out.exists() and out.read_text(encoding="utf-8") == new:
    print(f"{len(posts)} posts - no changes."); sys.exit(0)
out.write_text(new, encoding="utf-8")
print(f"Updated _data/medium.json with {len(posts)} posts.")
