# tanya-sriv.github.io

Portfolio + editorial blog. Terminal-styled home, editorial (Medium-beating)
blog posts. Built with Jekyll; GitHub Pages builds it automatically.

## Deploy (one time)

1. Create a repo named exactly `Tanya-Sriv.github.io` on GitHub.
2. Push these files to its `main` branch.
3. Repo → Settings → Pages → confirm "Deploy from a branch: main / root".
4. Site appears at https://tanya-sriv.github.io within a minute or two.

## Write a post

Add a markdown file to `_posts/` named `YYYY-MM-DD-your-title.md`:

```markdown
---
layout: post
title: "Your Title"
tags: [gpu, tooling]
read_time: "5 min read"
---

Your markdown here. Tables, code fences, footnotes[^1], nested lists all work.

[^1]: Like this.
```

Push. Done — no build tools needed on your machine.

## Traffic analytics (GoatCounter)

1. Sign up free at https://www.goatcounter.com/signup — pick a code
   (e.g. `tanya-sriv`; your dashboard becomes https://tanya-sriv.goatcounter.com).
2. Put that code in `_config.yml` under `goatcounter:` (already set to
   `tanya-sriv` — change it if you picked something else). Push.
3. Done. The dashboard shows total views, views **per post**, a timeline with
   selectable ranges (day / week / month / year / custom), plus referrers,
   countries, and devices. No cookies, so no consent banner is needed.

Tip: your own visits get counted too while testing — Settings → "Ignore IPs"
in GoatCounter filters yourself out.

## SEO tool setup (after deploying)

The site auto-generates `/sitemap.xml` and `/feed.xml` (RSS), plus robots.txt.
Order of operations:

1. **Google Search Console** (search.google.com/search-console): add property
   `https://tanya-sriv.github.io` → choose "HTML tag" verification → paste the
   content value into `google_site_verification:` in `_config.yml` → push →
   verify → submit the sitemap URL. Shows the exact search queries that find you.
2. **Bing Webmaster Tools** (bing.com/webmasters): "Import from Google Search
   Console" — done in two clicks. Also covers DuckDuckGo.
3. **Ahrefs Webmaster Tools** (ahrefs.com/webmaster-tools): add project →
   HTML-tag verify via `ahrefs_site_verification:` → free site audits +
   backlink alerts.
4. **PageSpeed Insights** (pagespeed.web.dev): just paste your URL — no setup.
   Tip: keep large images in `assets/` rather than data-URLs to stay fast.

No-setup research tools (nothing to install): Semrush free tier for
competitor keywords, AnswerThePublic for "questions people ask" post ideas,
Screaming Frog (desktop) for a crawl audit once the site has many pages.

## Change the theme

Every color lives in `:root` at the top of `assets/css/main.css`.
Edit those variables only; the whole site follows.

## Structure

- `_layouts/` — page templates (default = nav+footer, post = editorial surface + TOC)
- `_includes/toc.html` — generates the sticky table of contents from headings
- `_posts/` — blog posts (markdown)
- `assets/css/main.css` — the entire design system
- `assets/js/main.js` — copy buttons + TOC scroll-spy
- `preview/` — static design previews (not published; can be deleted)
