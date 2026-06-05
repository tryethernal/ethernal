# SERP/GSC/DataForSEO Integration Plan (porting ronda's feedback loop)

Plan to port ronda's search-feedback blog pipeline (GSC signals, DataForSEO keyword
enrichment, SERP coverage hints, refresh-mode) into ethernal-marketing's pipeline.

**Status:** Proposal. Not yet implemented.
**Source of truth studied:** `~/projects/ronda/blog/pipeline/` + ronda design docs
(`docs/superpowers/specs/2026-05-25-blog-keyword-enrichment-design.md`,
`docs/superpowers/handoffs/2026-05-27-blog-pipeline-sensai-integration.md`) +
ronda `.claude/rules/seo-geo.md` + Ronda Multica workspace RON-107…RON-211.

---

## 1. The two pipelines side by side

| Dimension | ronda | ethernal-marketing |
|---|---|---|
| Lang/runtime | Node ESM `.mjs`, self-contained | Node ESM `.js`, self-contained |
| Discovery | RSS/arXiv/HN/Reddit/PH/GH + **GSC content-gap** | EIPs/ERCs/ethresear.ch/Magicians/arXiv + Google Trends |
| Backlog store | **Multica issues** (`blog:` prefix, JSON-meta block) | **GitHub Projects V2** draft cards |
| Topic pick | `pick-next.mjs` (GSC refresh vs backlog, funnel bias) | `project.js` `pickNextTopic` (round-robin by cluster) |
| Draft engine | 3-phase Claude (research/draft/humanize) + 3b verify + GEO score | 3-phase Claude (research/draft/humanize) |
| Keyword data | **DataForSEO enrichment** (`enrich-keywords.mjs`) | none |
| SERP grounding | **`serp-terms.mjs`** (term/entity coverage at draft time) | none |
| Search feedback | **`gsc.mjs`** 5 signals → new/refresh decision | none |
| Refresh mode | **`refresh.mjs`** (quick-win/decay/ctr strategies) | none (recycles Published cards instead) |
| Sitemap ping | `submit-sitemap.mjs` post-merge GH Action | none |
| Schedule | Multica autopilots (cron) | systemd timers on Hetzner |

The **engine architecture is identical** (3-phase Claude, cluster scoring, content
types, em-dash-free humanize, References footer, GEO/answer-first posture). The gap is
entirely the **search feedback layer**: ronda closes the loop with real Google data;
ethernal does not.

### The biggest single discovery

The ronda GSC service account — `ethernal@ethernal-493613.iam.gserviceaccount.com`
— **already owns BOTH `sc-domain:useronda.com` AND `sc-domain:tryethernal.com`**
(verified in the handoff doc, `sites.list` returns both, both `siteOwner`). So:

- The credential that powers ronda's GSC integration **already has read access to
  `tryethernal.com` Search Console data**. No new GCP project, no new SA, no GSC UI
  user-add dance (which is the exact thing that blocked ronda for a day — see RON-112).
- `gsc.mjs` is already parameterized by `--site`. Pointing it at
  `sc-domain:tryethernal.com` is a one-flag change.

This collapses the single hardest part of ronda's rollout (the auth gotcha that ate a
day and leaked two credentials in chat) into "reuse the existing key."

---

## 2. Prompt differences (what ronda's prompts have that ethernal's don't)

ethernal's `prompts/2-draft.md` is 102 lines and already covers: voice, citations,
GEO/answer-first leading sentences, comparison-listicle structure, tables as extraction
targets, FAQ + FAQPage JSON-LD, research-depth (named customers/stats). It is a *good*
GEO prompt already.

ronda's `prompts/2-draft.md` (252 lines) adds layers ethernal lacks:

1. **Search-grounding block** (lines 20-52). Hard contract: `primaryKeyword` MUST appear
   in title + slug + first 150 words; `keywordsEnriched[]` phrases woven naturally;
   explicit "if the keyword doesn't fit the angle, comment on the issue and use the
   secondary, do not contort the post" escape hatch. **ethernal has no keyword input at
   all** — this is the enrichment consumer.

2. **SERP coverage targets block** (lines 5-16). Reads `/tmp/serp-terms.json` (`terms[]`,
   `entities[]`, `relatedSearches[]`, `peopleAlsoAsk[]`) as *soft* hints. Anti-stuffing
   rule is non-negotiable; the humanize phase enforces. **ethernal has no SERP grounding.**

3. **Princeton GEO study citations** (arXiv:2311.09735) made load-bearing: direct quotes
   (+27% citation visibility), statistics over adjectives (+25-37%), source citations
   (+25%). ronda's `1-research.md` *requires gathering* ≥1 verbatim attributed quote and
   concrete stats during research so the draft can use them. ethernal's research prompt
   is lighter on this.

4. **The hook frames the DECISION, not item #1** (lines 138-140, 162). A subtle but high-
   value anti-redundancy rule for listicles/comparisons: orient-then-answer, never
   cold-open, never pre-write the winner's pitch in the hook. ethernal's prompt doesn't
   have this nuance.

5. **References table as a hard schema** (lines 191-214): `| Source | Author/Org | Year |
   Supports |`, one row per cited source, fails the build if missing. ethernal uses a
   looser numbered-footnote `<sup>[N](#fn-N)</sup>` + `## References` style. Both work;
   ronda's is more machine-auditable (feeds the 3b source-verification subagent).

6. **`draft: true` hidden-draft gate** — ronda ships every new post as a hidden draft for
   human review. ethernal **publishes directly to develop with no review** (per
   MARKETING.md). This is a deliberate philosophy difference, **keep ethernal's** unless
   we want to add review friction.

7. **Scored GEO rubric** (`5-geo-score.md`, 6 weighted dims, 7.5/10 pass gate) +
   **parallel verify subagents** (`3b-verify-sources.md`). ethernal's humanize is a single
   pass. This is the quality-gate upgrade, separable from the search-feedback work.

**Recommendation on prompts:** port items 1-5 (search/SERP grounding + GEO depth). Defer
6 (keep ethernal's no-review publish) and 7 (scored rubric — nice-to-have, ship after the
feedback loop proves out).

---

## 3. The process / data flow ronda runs (what we're porting)

```
WEEKLY (trend scan):
  collect.mjs ──→ classify.mjs ──→ enrich-keywords.mjs ──→ (issues)
   + gsc-gap                          (DataForSEO volume,
   demand                              +30% cap on score)

EVERY 2 DAYS (draft):
  pick-next.mjs                          (GSC: quickWin/decay/ctr → refresh
    │                                     OR backlog → new, funnel-biased)
    ├── mode: refresh ──→ refresh.mjs ──→ targeted edits + chore(blog): refresh
    └── mode: new ──→ enrich (re-fresh stale kw) ──→ serp-terms.mjs ──→
                      research ──→ draft ──→ humanize ──→ feat(blog): publish

POST-MERGE:
  submit-sitemap.mjs (GH Action) ──→ GSC sitemap re-ping
```

Five GSC signals (`gsc.mjs`), all best-effort/exit-0:

| Signal | Window | Filter | Drives |
|---|---|---|---|
| siteSnapshot | 28d | aggregate | health line |
| quickWins | 28d | impressions≥50, pos 4–15 | **refresh** (almost-ranking) |
| contentGaps | 90d | impressions≥20, pos>20 | **new post** (unserved demand) |
| contentDecay | 28d vs prior | clicks −30% (≥5 baseline) | **refresh** (defensive) |
| ctrOpportunities | 28d | impr≥100, CTR ≤50% expected | **refresh title/meta only** |

Two bright lines from ronda's design (carry them verbatim):

- **Keyword volume enriches editorial candidates; it never sources them.** Boost capped at
  30% of editorial score. A candidate below the classify threshold is never enriched. This
  prevents "best CRM 2026"-shaped SEO slop.
- **`serp-terms.mjs` is draft-time grounding only.** It MUST NOT feed classify scoring or
  candidate creation. Soft hints, never density quotas.

---

## 4. The adaptation problem: Multica issues vs GitHub Projects

ronda's `pick-next.mjs` reads Multica issues; ethernal's `pickNextTopic` reads GitHub
Projects V2 cards. This is the **only structural rewrite** required. Two options:

**Option A (recommended): keep GitHub Projects, port the logic into `project.js`.**
- `gsc.mjs`, `enrich-keywords.mjs`, `serp-terms.mjs`, `keyword-providers/dataforseo.mjs`,
  `refresh.mjs`, `submit-sitemap.mjs` port almost verbatim (they're store-agnostic except
  pick-next/refresh path resolution).
- Rewrite `pick-next.mjs`'s backlog read to call `getProjectItems()` instead of
  `multica issue list`. The GSC-refresh half is store-agnostic and ports directly.
- Enrichment writes the `keywordsEnriched`/`primaryKeyword`/`finalScore` fields into the
  **card body** (already free-form markdown in `buildCardBody`) + optionally a new
  `Primary Keyword` / `Final Score` custom field on the board.
- `contentGaps` become new draft cards via `createProjectCard` with a synthetic
  `source: 'gsc-gap'` item.

**Option B: migrate ethernal's blog backlog to a Multica workspace** (there is no Ethernal
workspace today — only Capo/Better-UI/Ronda/Tenanture). Heavier; gains the autopilot
tooling but throws away the working GitHub Projects integration and the systemd-timer
deploy. **Not recommended** unless there's an independent reason to adopt Multica here.

Go with **Option A**.

---

## 5. Concrete work plan (phased, each independently shippable)

Mirror ronda's phased rollout — every phase is dead-safe on its own (broken search layer
degrades to exactly today's behavior).

### Phase 0 — Schema + cred plumbing (0.5 day)
- Add `keywords: z.array(z.string()).default([])` to `blog/src/content.config.ts`
  (additive, existing posts still build — they default to `[]`).
- Add to `/opt/blog-pipeline.env` on Hetzner: `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`,
  and `GSC_SERVICE_ACCOUNT_JSON_B64` (base64 of the existing ronda/ethernal SA key —
  it already owns `tryethernal.com`). Store actual values ONLY in `.credentials.local`
  / env file, never in the repo (this repo is PUBLIC).
- Add `blog/pipeline/.cache/` to `.gitignore`.
- `cd blog/pipeline && npm i googleapis` (for `gsc.mjs`).

### Phase 1 — GSC client + signals (1 day) [port `gsc.mjs`]
- Copy `gsc.mjs` verbatim. Change `DEFAULT_SITE` to `sc-domain:tryethernal.com`.
- Keep the cred-resolution order, the graceful-skip contract, the temp-file cleanup.
- Smoke: `node gsc.mjs --site sc-domain:tryethernal.com` → real data (this property has
  far more history than useronda.com did, so expect richer signals immediately).

### Phase 2 — DataForSEO keyword enrichment (1-1.5 days) [port `dataforseo.mjs` + `enrich-keywords.mjs`]
- Copy `keyword-providers/dataforseo.mjs` verbatim (both `fetchKeywordIdeas` and
  `fetchSerpOrganic`).
- Port `enrich-keywords.mjs`, adapting seed extraction to ethernal's cluster shape
  (`config.js` `CLUSTERS` keywords). **Critical:** ethernal's clusters are technical
  (e.g. "ERC-4337", "rollup", "zero knowledge") — these are already multi-word/distinctive,
  which is exactly the seed strategy ronda landed on (multi-word only, never single-word
  ambiguous nouns). The "feature flag only ever means software" logic applies even more
  cleanly to "account abstraction" / "encrypted mempool".
- Re-validate the volume ceiling. ronda capped at 10k for a 0-DR consumer domain;
  `tryethernal.com` is a higher-authority dev-tooling domain with niche B2B queries — the
  50–500/mo band still dominates, but revisit the ceiling after first run.
- Port `keyword-blacklist.json` (competitor names: Etherscan, Blockscout, Routescan, Alchemy,
  Infura, etc. — ethernal already has compare pages for these).
- Wire into the weekly run (`index.js`): after `classifyAndScore`, before card creation,
  run enrichment and write `finalScore` + keyword block into the card body.

### Phase 3 — SERP coverage hints (0.5 day) [port `serp-terms.mjs`]
- Copy `serp-terms.mjs` verbatim. It's pure (term/entity extraction + cache); no ethernal-
  specific changes beyond the UA string and cache path.
- In `draft.sh`, before Phase 1 research, run `serp-terms.mjs --keyword "$PRIMARY_KW"` →
  `.serp-terms.json` when a primary keyword exists.
- Add the SERP-coverage + search-grounding blocks to `prompts/2-draft.md` and the SERP-
  context paragraph to `prompts/1-research.md` (port items 1-2 from §2).

### Phase 4 — GSC-driven pick + refresh (1.5-2 days) [adapt `pick-next.mjs`, port `refresh.mjs`]
- Add a `--gsc` mode to `index.js`/`project.js`: before the round-robin backlog pick,
  call `fetchGscSignals({ site: 'sc-domain:tryethernal.com' })`; map `quickWins`/
  `contentDecay`/`ctrOpportunities` pages → blog slugs (`slugFromPageUrl`, adapt the
  `/blog/<slug>` URL pattern to ethernal's blog URL structure) → existing post files in
  `blog/src/content/blog/`.
- If a signal maps to a real post → emit `{mode:'refresh', signal, slug, metrics}`;
  else fall through to `pickNextTopic`.
- Port `refresh.mjs` (the three strategies: `expand_for_query`, `verify_and_update`,
  `rewrite_title_meta_only`). Adapt `BLOG_POSTS_DIR` and the frontmatter parser to
  ethernal's schema (no `updatedDate` field yet — add `updatedDate` to the Zod schema and
  render it in the post layout, mirroring ronda PR 2.1).
- `draft.sh` branches on mode: refresh → targeted edits + `chore(blog): refresh` style
  commit; new → existing flow. Note ethernal publishes directly to develop, so "refresh"
  is a direct commit, not a draft PR.
- `contentGaps` → new cards in the weekly scan (synthetic `gsc-gap` source items).

### Phase 5 — Sitemap re-ping (0.25 day) [port `submit-sitemap.mjs`]
- Copy `submit-sitemap.mjs`, point at `tryethernal.com` sitemaps.
- The existing SA must be **Owner** (not just full-user) of the GSC property to submit
  sitemaps (ronda gotcha, `seo-geo.md` line 25). Verify the ethernal SA's role on
  `sc-domain:tryethernal.com`; promote to Owner if needed.
- Wire a GH Action on push-to-develop touching `blog/src/content/blog/**` (ethernal already
  auto-deploys blog changes on develop — add the ping step there).

### Phase 6 (optional, defer) — quality gates
- Scored GEO rubric (`5-geo-score.md`) + parallel verify subagents (`3b-verify-sources.md`).
- Funnel-position tagging + 80/20 TOFU/MOFU bias (`stats.mjs`). Lower priority for a
  technical dev-tooling blog than for ronda's PM/designer funnel.

---

## 6. Cost, risk, and the bright lines

**Cost.** DataForSEO: enrichment ~$0.075/1000 keywords (cents per weekly run);
`serp/google/organic/live/advanced` ~$0.002-0.006/call, one per new-post draft. GSC API:
free. Total: well under $5/mo. 30-day keyword cache + 7-day SERP cache keep it near-zero.

**Risk register (all mitigated by the best-effort contract):**
- DataForSEO down/quota (cf. ronda RON-136 "DataForSEO 402 enrichment down") → enrichment
  no-ops, `finalScore === score`, pipeline produces identical candidate set. **Verified
  contract in `enrich-keywords.mjs`: exit 0 always.**
- GSC SA rotated/revoked → `gsc.mjs` returns `{status:'skipped'}`, pick falls through to
  backlog. No crash.
- Cross-project SA coupling: the GSC key belongs to GCP project `ethernal-493613`. For
  ethernal-marketing this is actually the *natural* owner (it's the ethernal project),
  removing ronda's RON-112 tech-debt entirely on this side.

**The two invariants to enforce in code review (copy from ronda):**
1. Keyword volume enriches, never sources, candidates. Boost ≤30% of editorial score.
   Candidates below threshold are never enriched.
2. `serp-terms.mjs` is draft-time grounding only. It never touches `classify.js` scoring
   or card creation. classify output must be byte-identical before/after the module exists.

**Secrets discipline (repo is PUBLIC):** never commit `DATAFORSEO_*`, the GSC SA JSON, or
the base64. Reference by name only; values live in `.credentials.local` and
`/opt/blog-pipeline.env`.

---

## 7. Files to create/modify in ethernal-marketing

New (ported from ronda, near-verbatim):
- `blog/pipeline/gsc.mjs`
- `blog/pipeline/enrich-keywords.mjs`
- `blog/pipeline/serp-terms.mjs`
- `blog/pipeline/keyword-providers/dataforseo.mjs`
- `blog/pipeline/keyword-blacklist.json`
- `blog/pipeline/refresh.mjs`
- `blog/pipeline/submit-sitemap.mjs`
- `.github/workflows/blog-submit-sitemap.yml`

Modify:
- `blog/pipeline/index.js` (wire enrichment into weekly run; add `--gsc` pick path)
- `blog/pipeline/project.js` (write keyword/finalScore to card body; GSC-refresh branch;
  `gsc-gap` cards)
- `blog/pipeline/classify.js` (optional: keep store-agnostic; no scoring change needed)
- `blog/pipeline/config.js` (keyword weight `scoreBonus.keywordVolume`, volume floors/
  ceilings, optional per-cluster `enrichmentEnabled`)
- `blog/pipeline/prompts/1-research.md` (SERP context + GEO gathering)
- `blog/pipeline/prompts/2-draft.md` (search-grounding + SERP-coverage blocks)
- `blog/pipeline/draft.sh` (serp-terms pre-flight; refresh-mode branch)
- `blog/pipeline/package.json` (add `googleapis`)
- `blog/pipeline/.gitignore` (add `.cache/`)
- `blog/src/content.config.ts` (add `keywords` + `updatedDate`)
- `blog/src/.../PostLayout` (render "Updated: <date>" + JSON-LD `dateModified`)
- `.claude/references/MARKETING.md` (document the new search-feedback layer)

---

## 8. Open questions to resolve before building

1. **GSC SA Owner role on `tryethernal.com`?** Sitemap submit needs Owner. Confirm /
   promote. (Read access for signals is already confirmed via `sites.list`.)
2. **Blog URL → slug mapping.** ronda assumes `/blog/<slug>`. Confirm ethernal's blog URL
   structure (`tryethernal.com/blog/<slug>`?) so `slugFromPageUrl` maps correctly.
3. **Keep direct-publish or add hidden-draft review?** ronda gates new posts behind
   `draft: true` for human review; ethernal auto-publishes. Recommend keeping auto-publish
   for now; the GEO/scored-rubric gate (Phase 6) is the quality safety net if drift appears.
4. **Volume ceiling for a higher-authority domain.** Re-tune after the first enriched run
   against `tryethernal.com`'s actual GSC ranking data.
