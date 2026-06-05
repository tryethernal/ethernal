# SERP Research Findings — tryethernal.com (live run)

Live run of the ported ronda SERP stack (GSC signals + DataForSEO keyword volume +
`serp-terms.mjs` coverage) against `sc-domain:tryethernal.com`, using the existing
`~/.credentials/gsc-ronda.json` (reads tryethernal.com) and `~/.credentials/dataforseo-ronda`.

**Run date:** see git. **28-day baseline:** 8,441 impressions, 77 clicks, avg pos 11.0,
CTR 0.91%. Signals: 18 content gaps, 6 quick wins, 9 CTR opportunities, 3 decaying pages.

> **Read this caveat first.** DataForSEO's Google-Ads volume is **bucketed/zero for niche
> dev queries** (the exact failure ronda's spec flagged). For our queries, **GSC impression
> counts are the more reliable demand signal** — they're *our actual observed demand*, not a
> third-party estimate. Where DataForSEO returned real volume (head terms), it's noted.

---

## The four opportunities, by priority

### 1. Converter utility pages — fix ranking, not write a blog post  ⭐ highest leverage

GSC content gaps are dominated by **unit-converter queries** we rank for on page 3-4:

| Query | GSC impr (90d) | GSC pos | DataForSEO vol |
|---|---|---|---|
| wei to eth | 119 | 26.9 | (bucketed ~0) |
| gwei to eth | 83 | 38.5 | (bucketed ~0) |
| wei to ether | 31 | 39.3 | **260/mo, LOW** |
| eth to wei | 25 | 30.4 | (bucketed ~0) |
| gwei to wei | — | — | 30/mo, LOW |
| wei converter | — | — | 50/mo, LOW |

We already own `landing/src/pages/tools/UnitConverterPage.vue` — and it surfaces in CTR
opportunities at **position 24, 380 impressions, 0.26% CTR**. The page exists and ranks
badly. SERP for "wei to eth" shows pure converter intent (entities: Unit Converter, Ether,
Gwei, Wei, Finney, Szabo; PAA: "How much is 1 ETH in Wei?", "How much is 1 wei?", "What is
a wei Ethereum?", "How much is 1 Wei in dollars?").

**Action: on-page SEO for the converter tool, not a blog post.**
- Add per-pair landing routes/anchors (`/tools/unit-converter#wei-to-eth`, gwei-to-eth, etc.)
  or dedicated thin pages with the query as H1.
- Answer the 4 PAA questions inline (answer-first, ≤60 words each) — these are extractable.
- Add HowTo/FAQ-legible content + a worked example with real numbers.
- This is the clearest-intent, we-already-have-the-asset, lowest-effort win in the dataset.

### 2. "EVM explorer / block explorer hosting" — quick wins at pos 5-15, 0% CTR  ⭐ blog/landing

Money keywords where we're *almost* on page 1 but getting **zero clicks**:

| Query | GSC impr (28d) | GSC pos | CTR | DataForSEO vol |
|---|---|---|---|---|
| block explorer hosting | 121 | 5.8 | 0.82% | (bucketed) |
| evm explorer | 87 | 6.9 | 0% | 10/mo, LOW |
| evm scan | 93 | 8.0 | 0% | 20/mo, LOW (cpc $10) |
| launch custom block explorer | 135 | 14.8 | 0% | (bucketed) |

SERP vocabulary for "evm explorer": blockchain explorer, **Blockscout**, Etherscan,
"EVM Block Explorer" entity. "launch custom block explorer" SERP is thin (Autoscout the
only real competitor) — **a genuine content gap**. "block explorer hosting" SERP is
half Bitcoin-noise — also winnable.

**Action: a focused landing page or blog post** on "self-hosted / custom EVM block explorer"
targeting all four. This is Ethernal's core product positioning, so a `/launch-block-explorer`
or `/evm-block-explorer` landing (or a how-to blog post) maps directly to intent. The 0% CTR
at pos 6-8 says the homepage is matching but not satisfying these queries — they want a
*dedicated* answer page.

### 3. Explorer-discovery head terms — high volume, we're on page 3-6  ⭐ refresh existing post

The surprise: real head-term volume, LOW competition, and we already rank (badly):

| Query | GSC impr (90d) | GSC pos | DataForSEO vol |
|---|---|---|---|
| ether explorer | 77 | 34.4 | **49,500/mo, LOW** |
| blockchain explorer | — | — | **22,200/mo, LOW** |
| ethereum explorer | 73 | 52.3 | (bucketed) |
| eth explorer | 67 | 61.7 | (bucketed) |
| chain explorer | 62 | 59.0 | 70/mo |
| multi chain explorer | 55 | 52.3 | 20/mo |
| best block explorer | 34 | 56.7 | 140/mo, LOW |
| arbitrum explorer | 27 | 26.3 | 210/mo, LOW |
| optimism explorer | 48 | 36.1 | 170/mo, LOW |

"ether explorer" at 49.5k/mo is the biggest raw-volume term in the set and we're at
position 34. SERP is Etherscan/Ethplorer-dominated (hard head term), BUT **"multi chain
explorer"** SERP is Blockscan/Multichain — *exactly* Ethernal's multi-chain positioning,
and far more winnable. **"arbitrum explorer"/"optimism explorer"** (pos 26-36, 170-210/mo)
map straight onto our existing **chain landing pages** (`ArbitrumOnePage.vue`,
`OptimismPage.vue`) — those pages should target "<chain> explorer" intent directly.

We already have `best-block-explorers-evm-chains-2026.md` (ranks, 12 min read, full
comparison + FAQ). It targets "best block explorer" but isn't capturing the "ether/eth/
chain/multi-chain explorer" variant demand.

**Action (refresh, not new):**
- Expand the existing best-block-explorers post to cover the "ether explorer / multi-chain
  explorer / chain explorer" query variants (ronda's `expand_for_query` strategy).
- Ensure chain landing pages (`/chains/arbitrum-one`, `/chains/optimism`) target
  "<chain> explorer" in title/H1/meta — they're already ranking pos 11-36 for these.
- Don't chase "ether explorer" (49.5k) head-on against Etherscan; chase the multi-chain +
  per-L2 long tail where we have a real product wedge.

### 4. Existing page CTR rewrites — page-1 rankings leaking all clicks  ⭐ cheapest win

Pages ranking on page 1 with **~0% CTR** = title/meta problem, not content problem
(ronda's `rewrite_title_meta_only` strategy — two frontmatter fields, no body edits):

| Page | GSC pos | GSC impr | CTR |
|---|---|---|---|
| `/blog/the-commerce-layer-erc-8183` | 9.0 | **815** | 0% |
| `/etherscan-alternative` | 8.5 | 356 | 0.27% |
| `/blockscout-alternative` | 8.4 | 385 | 0% |
| `/routescan-alternative` | 8.6 | 250 | 0% |
| `/chains/arbitrum-one` | 11.8 | 189 | 0% |
| `/blog/what-does-it-mean-to-sell-an-ai-agent` | 7.6 | 102 | 0% |
| `/tools/unit-converter` | 24.3 | 380 | 0.26% |

`the-commerce-layer-erc-8183` at 815 impressions / 0% CTR is the single biggest pure-CTR
leak. The three `*-alternative` pages rank page-1 and convert nothing — their titles/metas
need a curiosity-gap or concrete-benefit rewrite.

**Action: rewrite title + meta-description** on these 6-7 pages. Highest ROI per minute of
work in the entire dataset. No new content required.

---

## Recommended execution order (by ROI)

1. **Title/meta rewrites** (Opp 4) — hours of work, page-1 rankings already there. Start with
   `the-commerce-layer-erc-8183`, the three `*-alternative` pages.
2. **Converter tool SEO** (Opp 1) — we own the asset, demand is clear, intent is unambiguous.
3. **Chain-page "<chain> explorer" targeting** (Opp 3, subset) — existing pages, just retarget
   title/H1/meta for arbitrum/optimism explorer.
4. **"Launch a custom EVM block explorer" landing or post** (Opp 2) — net-new, but core product
   intent and a genuine SERP gap.
5. **Expand best-block-explorers post** for explorer-discovery variants (Opp 3, main).

## What this validates about the integration plan

- The **GSC signal layer is the high-value piece** for ethernal — it surfaced 4 concrete,
  prioritized opportunities from real demand, most of which are *page fixes*, not blog posts.
- **DataForSEO volume is secondary here** (bucketed for our niche), but the SERP term/entity
  extraction (`serp-terms.mjs`) is useful for competitive vocabulary + PAA mining.
- The ronda **refresh-mode strategies map 1:1** onto what we found: `rewrite_title_meta_only`
  (Opp 4), `expand_for_query` (Opp 3). Porting `refresh.mjs` is well-justified.
- Biggest practical insight: **for a product-led dev-tooling site, "what should we write
  about" is often "what page should we fix/build" — the loop points at landing/tool pages
  more than blog posts.** The pipeline should be able to emit non-blog actions too.

## Reproduce this run

```bash
cd ~/projects/ronda/blog/pipeline
GSC_KEY_FILE=~/.credentials/gsc-ronda.json node gsc.mjs --site sc-domain:tryethernal.com
LOGIN=$(sed -n 1p ~/.credentials/dataforseo-ronda); PASS=$(sed -n 2p ~/.credentials/dataforseo-ronda)
DATAFORSEO_LOGIN=$LOGIN DATAFORSEO_PASSWORD=$PASS node serp-terms.mjs --keyword "multi chain explorer"
# volumes: POST keywords_data/google_ads/search_volume/live with location_code 2840
```
