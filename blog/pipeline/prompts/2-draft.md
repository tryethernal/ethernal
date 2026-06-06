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

## Search grounding (read before drafting)

The card body (`blog/pipeline/.card-body.md`) may include a `### Top keywords (search intent)` section listing real Google search phrases with monthly volume, one marked `(primary)`. These come from DataForSEO keyword data — the phrases your audience actually types.

**When a `(primary)` keyword is present:**
1. It MUST appear in the article `title:` frontmatter.
2. It SHOULD appear once in the first 150 words of the body, in a sentence that genuinely uses the phrase.
3. Weave 1-3 of the other listed phrases into headings/body **only where they fit naturally**. Drop any that would require contorted phrasing — Phase 3 flags keyword-stuffing.
4. Put the primary keyword first in the `keywords:` frontmatter array, followed by the other phrases you actually used.

**If the primary keyword doesn't fit the strongest angle from research:** don't contort the post. Use the next-best listed phrase in the title and opening instead. Editorial quality beats any keyword heuristic.

**When there is no keyword section** (enrichment unavailable): draft normally and set `keywords: []` in frontmatter. Same voice, same quality bar.

### SERP coverage hints (soft — optional)

If `blog/pipeline/.serp-terms.json` exists with `"status": "ok"`, it has:
- `terms[]` — vocabulary competitors use most (a reading list, not a checklist)
- `entities[]` — tools/products that appear in competing pages (mention if relevant, ignore if not)
- `peopleAlsoAsk[]` — reader questions; answering one or two directly in a section is a strong AI-citation win
- `relatedSearches[]` — adjacent angles readers care about

**Anti-stuffing (non-negotiable):** coverage is SOFT. Use a term only if it fits a sentence you'd write anyway. If the file is absent or `"status": "skipped"`, draft without it — same quality bar. Never mention the skip in the post.

**Content Type formats:**
- "ERC Tutorial": Code-heavy, working Solidity, deploy instructions, practical examples
- "EIP Explainer": What it changes, why it matters, before/after code examples
- "Research Deep Dive": Break down proposals, extract practical insights, code snippets
- "Upgrade Guide": Step-by-step migration with code changes
- "Trend Survey": Survey related proposals, compare approaches, interface examples
- "Comparison Listicle": Structured comparison of tools/products. See Comparison Listicle section below.

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

**AI SEO structure (GEO optimization):**
- Lead every section with a direct answer. AI models extract the first 1-2 sentences of each section.
- H2/H3 headings that match how people phrase queries (e.g., "What is the best X?" not "Overview of X")
- Tables for comparisons, numbered lists for processes. Tables are the #1 extraction target for AI models.
- Self-contained answer blocks that work without surrounding context. Each section should make sense if quoted alone.
- Include specific, verifiable data points: dollar amounts, chain counts, setup times, named customers. Vague claims ("growing ecosystem") are never cited by AI models. Specific claims ("supports 1,000+ networks including Ethereum, Optimism, and Base") are.
- Cite real incidents and events as evidence, not just product pages. A CoinTelegraph article about a pricing controversy is more citable than a company's own marketing page.
- FAQ sections with H3 question headings matching "People Also Ask" queries. Add FAQPage JSON-LD schema at the bottom of articles with FAQ sections.

**Research depth (CRITICAL):**
- Never use "not publicly listed" or "contact sales" as the only pricing info if a real number exists somewhere (news articles, community reports, SEC filings). Dig deeper.
- Name specific customers, deployments, and ecosystems when describing a product. "Used by major ecosystems" is weak. "Used by Ethereum, Optimism, Arbitrum, Base, and Gnosis" is strong and citable.
- When describing Ethernal, include real stats from the production database: explorer count, chain count, user count. Query the DB during research phase. These numbers make the Ethernal section competitive with established products that cite large numbers.
- For every competitor, find at least one specific, sourced data point beyond their own marketing page.

**Comparison Listicle format:**
When the Content Type is "Comparison Listicle":
- Target 2,500-3,200 words
- Include "Last updated: [Month Year]" below the title
- Structure: intro > evaluation criteria > per-item sections > comparison table > decision framework > walkthrough (if Ethernal-relevant) > FAQ > key takeaways > references
- Comparison table: put criteria as rows, products as columns. This is the primary AI extraction target.
- Decision framework: include a "Why" column explaining the recommendation, not just "Use Case" and "Recommended"
- Position Ethernal honestly (not #1 unless warranted). Credibility with skeptical readers beats self-promotion.
- Be transparent about Ethernal's limitations (EVM-only, beta self-hosted, smaller ecosystem)
- Include a hands-on walkthrough section with real CLI commands if applicable. No competitor does this.

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
keywords:
  - primary search phrase (from the card's Top keywords, marked primary)
  - other phrases you actually wove into the body, in volume order
image: "/blog/images/<slug>.png"
ogImage: "/blog/images/<slug>-og.png"
status: published
readingTime: N
---
```

`keywords:` is the SEO-grounding array (separate from reader-facing `tags`). Populate it from the card's Top keywords section — primary first, then any others you genuinely used. If there was no keyword section, write `keywords: []`. It renders into JSON-LD `BlogPosting.keywords`, not as UI chips.

Then output the file path on a line starting with `::article-path::`
