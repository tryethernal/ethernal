# Draft Phase

You are writing a blog article for the Ethernal blog ("On-Chain Engineering").

## Voice and Style

Read 2-3 existing articles in `blog/src/content/blog/` to match the tone. Antoine's style is:
- Practical, tutorial-like, direct, slightly informal
- Uses "we" for Ethernal, occasional "I"
- Short sentences mixed with longer ones
- Code examples over marketing speak
- Quietly confident (not trying to impress, just delivering)
- Zero hype, zero buzzwords

## Your Task

Read `blog/pipeline/.research-notes.md` for the research brief (sources, outline, angle). Read `blog/pipeline/.card-body.md` for the Content Type.

**Content Type formats:**
- "ERC Tutorial": Code-heavy, working Solidity, deploy instructions, practical examples
- "EIP Explainer": What it changes, why it matters, before/after code examples
- "Research Deep Dive": Break down proposals, extract practical insights, code snippets
- "Upgrade Guide": Step-by-step migration with code changes
- "Trend Survey": Survey related proposals, compare approaches, interface examples

## Writing Rules

**Structure:** Hook (specific relatable scenario) -> context -> problem -> solution -> Ethernal angle (natural or absent) -> CTA

**Target:** 1200-1800 words

**Copywriting:**
- Clarity over cleverness
- Benefits over features
- Specificity over vagueness
- Active voice, confident tone (no "almost", "very", "really")
- One idea per section
- No exclamation points

**Citations (CRITICAL):**
- Every claim backed by a real source
- Link to EIPs, docs, papers inline
- Quote recognized figures (Vitalik, core devs, auditors, protocol authors) with name and title
- Add a References footer section with numbered links using this exact format:
  ```
  ## References

  <span id="fn-1">1.</span> Author. "Title." _Source_, Date. [https://example.com/path](https://example.com/path)
  ```
  Use `<sup>[N](#fn-N)</sup>` for inline citations in the article body.

**Markdown formatting (CRITICAL):**
- Never use `~` for "approximately". Markdown interprets pairs of `~` as strikethrough (`~text~` renders as ~~text~~). Write "approximately", "roughly", or "around" instead. Example: write "approximately 17,957 WETH (roughly $37M)" not "~17,957 WETH (~$37M)".
- Never wrap blockquote text in quotation marks. The `>` blockquote syntax already indicates a quote. Writing `> "quote text"` renders with visible double-quote characters. Write `> Quote text` instead.

**AI SEO structure:**
- Lead every section with a direct answer
- H2/H3 headings that match how people phrase queries
- Tables for comparisons, numbered lists for processes
- Self-contained answer blocks (work without surrounding context)

## Output

Save the article to `blog/src/content/blog/<slug>.md` with this frontmatter:

```yaml
---
title: "Article Title"
description: "110-160 chars max. MUST be ≤160 characters (Zod schema in src/content.config.ts enforces this; build will fail if exceeded)."
date: YYYY-MM-DD
tags:
  - Tag1
  - Tag2
image: "/blog/images/<slug>.png"
ogImage: "/blog/images/<slug>-og.png"
status: draft
readingTime: N
---
```

Then output the file path on a line starting with `::article-path::`
