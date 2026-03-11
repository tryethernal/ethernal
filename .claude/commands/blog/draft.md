---
description: Write a complete blog article from the research brief and push to Ghost as draft
---

# Blog Draft

Write a complete, publication-ready article and push it to Ghost as a draft.

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

10. **Save locally** to `~/ethernal-blog/drafts/<slug>.md` with frontmatter:
    ```yaml
    ---
    title: "Article Title"
    tags: category1, category2
    date: YYYY-MM-DD
    status: draft
    ---
    ```

11. **Push to Ghost** — Run:
    ```bash
    node ~/ethernal-blog/ghost-publish.mjs create ~/ethernal-blog/drafts/<slug>.md
    ```
    Save the returned Ghost post ID for the next steps.

## Cover Image & Social Cards

12. **Generate a cover image** using the Gemini API (see `~/ethernal-blog/gen-image.mjs` helper or call directly):
    - Use `gemini-3-pro-image-preview` model (best text rendering) or `imagen-4.0-generate-001` (batch variations)
    - If `gemini-2.5-flash-image` is available and not rate-limited, it also works
    - Generate 4 variations and pick the best one
    - Request `aspectRatio: "16:9"` for landscape social cards
    - Resize final image to exactly **1200x630** with ImageMagick: `magick input.png -resize 1200x630! output.png`
    - Prompt structure: describe layout (left/right split), specific text to render, "dark navy background", "flat minimal design, developer aesthetic"

13. **Upload image to Ghost** via the Admin API image upload endpoint:
    ```
    POST /ghost/api/admin/images/upload/
    ```

14. **Set all post metadata** via Ghost Admin API PUT on the post:
    - `feature_image` — the uploaded image URL
    - `feature_image_alt` — descriptive alt text
    - `feature_image_caption` — short contextual caption
    - `custom_excerpt` — 1-2 sentence summary for post cards (different from meta_description)
    - `meta_title` — SEO title (can match post title)
    - `meta_description` — Google snippet, ~155 chars, practical description
    - `og_title`, `og_description`, `og_image` — Facebook/Open Graph card
    - `twitter_title`, `twitter_description`, `twitter_image` — Twitter/X card
    - Vary the descriptions slightly across SEO/OG/Twitter for natural diversity

15. **Constrain cover image size** — Ghost's Casper theme renders feature images full-width by default. Add CSS via `codeinjection_head` to make it smaller and centered:
    ```html
    <style>.article-image { max-width: 640px; justify-self: center; } .article-image img { border-radius: 8px; }</style>
    ```
    Note: the parent is a CSS grid, so use `justify-self: center` (not `margin: auto`). The class is `.article-image` (not `.post-full-image`).

16. **Verify with Playwright** — Navigate to the Ghost preview URL and take a screenshot to confirm the image renders at the right size and is centered.

17. **Present the draft** with the Ghost editor URL for review.

## Ghost API Reference

- **Auth**: JWT signed with HS256 using the admin API key (`{id}:{secret}` from `~/ethernal-blog/.env`)
- **Helper script**: `node ~/ethernal-blog/ghost-publish.mjs create|update|delete`
- **Image upload**: `POST /ghost/api/admin/images/upload/` with FormData (file + purpose)
- **Post update**: `PUT /ghost/api/admin/posts/{id}/` — must include `updated_at` from a fresh GET
- **Preview URL format**: `https://blog.tryethernal.com/p/{uuid}/`
- **Editor URL format**: `https://blog.tryethernal.com/ghost/#/editor/post/{id}`

## Quality Checklist

Before pushing, verify:
- [ ] Hook is specific and relatable (not generic)
- [ ] No AI-isms ("delve", "landscape", "in conclusion", "it's worth noting")
- [ ] Zero em dashes (use commas, periods, colons, or parentheses instead)
- [ ] Code examples are correct and tested conceptually
- [ ] Ethernal mention is natural (or absent if forced)
- [ ] 1200-1800 word range
- [ ] Subheadings are scannable
- [ ] CTA is clear
- [ ] Cover image generated, uploaded, and sized correctly (640px, centered)
- [ ] All metadata fields populated (SEO, OG, Twitter, excerpt, alt text, caption)
- [ ] Verified rendering via Playwright screenshot
