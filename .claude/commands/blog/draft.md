---
description: Write a complete blog article from the research brief and push to Ghost as draft
---

# Blog Draft

Write a complete, publication-ready article for the Ethernal Astro blog.

## Pre-Writing

1. **Read feedback log** — Use Inkwell `list_notes` (tag: feedback) to internalize all past editorial preferences. These are NON-NEGOTIABLE rules.

2. **Read voice template** — Read `~/ethernal-blog/templates/voice/ethernal-refined.md` for tone, structure, and learned preferences.

3. **Read product context** — Read `.agents/product-marketing-context.md` for accurate product messaging.

4. **Read codebase context** — Read files in `~/ethernal-blog/context/` for:
   - `landing-copy.md` — marketing alignment
   - `feature-map.md` — technical accuracy
   - `code-snippets.md` — reusable examples

5. **Get research brief** — Run Inkwell `prepare_brief` for the article.

## Writing

6. **Invoke the `copywriting` skill** for structure, hooks, and persuasion guidance.

7. **Write the article** following:
   - Voice template structure (hook → context → problem → solution → Ethernal angle → CTA)
   - Match the tone of the 7 existing human-written Ghost posts
   - All accumulated feedback preferences (from step 1)
   - Target: 1200-1800 words
   - Include code snippets where relevant (use language-tagged code blocks)
   - Ethernal mentions should feel natural (or absent if forced)

8. **Add citations and references** — Every article should cite real sources:
   - Link to EIPs, official docs, research papers, or protocol specs inline
   - Quote or reference recognized figures of authority in the space (e.g. Vitalik, protocol authors, core devs, auditors)
   - Reference subject matter experts when discussing specific topics
   - Add a **References** footer section at the bottom (before CTA), listing all sources with links
   - Style reference: https://www.sensai.fit/blog (see how they structure citations and reference footers, e.g. https://www.sensai.fit/blog/low-hrv-normal-rhr-train-or-recover-framework)
   - Format:
     ```markdown
     ## References

     1. [EIP-2929: Gas cost increases for state access opcodes](https://eips.ethereum.org/EIPS/eip-2929) — Vitalik Buterin, Martin Swende
     2. [Ethereum Yellow Paper](https://ethereum.github.io/yellowpaper/paper.pdf) — Gavin Wood
     3. ...
     ```

9. **Invoke the `humanizer` skill** to remove AI writing artifacts.

10. **Invoke the `ai-seo` skill** to optimize for AI search discoverability.

## Publishing

11. **Save the article** to `blog/src/content/blog/<slug>.md` with frontmatter:
    ```yaml
    ---
    title: "Article Title"
    description: "110-160 chars max. Concise summary for OG/SEO display."
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

    **Frontmatter rules:**
    - `description`: **Must be 110-160 characters.** Zod schema enforces max 160. This is used for meta description, og:description, and twitter:description.
    - `image`: Cover image displayed in the article (1424x752px recommended)
    - `ogImage`: Social sharing image (must be exactly **1200x630px**). Generated separately from cover.
    - `status`: Always `draft` initially. Changed to `published` by the publish workflow.

## Cover Image & Social Cards

12. **Generate a cover image** using the Gemini API (see `~/ethernal-blog/gen-image.mjs` helper or call directly):
    - Use `gemini-3-pro-image-preview` model (best text rendering) or `imagen-4.0-generate-001` (batch variations)
    - If `gemini-2.5-flash-image` is available and not rate-limited, it also works
    - Generate 4 variations and pick the best one
    - Prompt structure: describe layout (left/right split), specific text to render, "dark navy background", "flat minimal design, developer aesthetic"

13. **Generate two image sizes:**
    - **Cover image** (1424x752): `magick input.png -resize 1424x752! blog/public/images/<slug>.png`
    - **OG image** (1200x630): `magick input.png -resize 1200x630! blog/public/images/<slug>-og.png`
    - The cover is shown in-article; the OG image is used for social previews (Twitter, Slack, Discord, etc.)

## Quality Checklist

Before committing, verify:
- [ ] Hook is specific and relatable (not generic)
- [ ] No AI-isms ("delve", "landscape", "in conclusion", "it's worth noting")
- [ ] Zero em dashes (use commas, periods, colons, or parentheses instead)
- [ ] Code examples are correct and tested conceptually
- [ ] Ethernal mention is natural (or absent if forced)
- [ ] 1200-1800 word range
- [ ] Subheadings are scannable
- [ ] CTA is clear
- [ ] Cover image generated at 1424x752 (`image` field)
- [ ] OG image generated at 1200x630 (`ogImage` field)
- [ ] Description is 110-160 characters
- [ ] All frontmatter fields populated
