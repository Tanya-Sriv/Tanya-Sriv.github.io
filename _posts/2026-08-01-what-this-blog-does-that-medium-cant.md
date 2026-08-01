---
layout: post
title: "Everything This Blog Can Do That Medium Can't"
tags: [meta, writing]
read_time: "4 min read"
---

This site exists partly because Medium's editor can't do the things technical
writing needs. Here's the tour — every feature below renders natively here and
requires a hack (or is impossible) on Medium.

## Real tables

| Feature | Medium | This site |
|---|---|---|
| Tables | Screenshot of a spreadsheet | Native markdown |
| Table of contents | Auto-only, desktop-only (since Jul 2026) | Author-controlled, sticky, mobile too |
| Code highlighting | Plain monospace or embedded Gist | Rouge, built in, with copy button |
| Heading levels | 2 | 6 |
| Footnotes | Manual superscript hack | Native[^1] |
| Math | Unicode hacks | Add KaTeX when needed |

## Deep heading hierarchy

### Like this H3

#### And this H4

Medium stops at two levels, which flattens any long tutorial.

## Highlighted code with a copy button

```c
// Hover this block — there's a copy button. Try that on Medium.
static inline uint32_t clamp_freq(uint32_t hz) {
    return hz > MAX_HZ ? MAX_HZ : hz;
}
```

## Nested lists

- Scheduling policies
  - Static pinning
  - Greedy earliest-finish
    - With power penalty
- Telemetry

## And the platform-level stuff

No paywall, no algorithm deciding who sees this, SEO that accrues to *this*
domain, and every post is a markdown file in a git repo — fully owned,
trivially exportable.

[^1]: This is a native footnote. Click the arrow to jump back. ↩
