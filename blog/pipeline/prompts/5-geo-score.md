# 5-geo-score: scored GEO (Generative Engine Optimization) rubric

## Purpose

Quantitative pass/fail gate for new blog posts, run after Phase 3 humanize. Replaces a "vibes-based" exit with a numeric score against 6 weighted dimensions. Below the threshold = the main agent re-runs targeted fixes with the dimension-specific feedback, then re-scores (2-iteration cap).

This prompt is consumed by a scoring subagent in Phase 3b of the Ethernal blog pipeline. It is paired with `prompts/3b-verify-sources.md` (source-claim verification), which runs alongside it.

## Why "GEO" not just "SEO"

Generative Engine Optimization. Ranks for what answer-engine LLMs (Perplexity, ChatGPT browse mode, Google AI overviews, Claude with browsing) cite when synthesizing answers. The dimensions below are what those engines reward: verified sources, extractable answer-first passages, direct quotations, concrete statistics, named entities, structural clarity. Pure-SEO heuristics (keyword density, internal-linking) are necessary but not sufficient for GEO, and keyword stuffing is *measurably counterproductive* (-10% citation visibility on Perplexity in the Princeton GEO study, arXiv:2311.09735).

**The measured top-3 GEO techniques** (Princeton GEO study, validated on Perplexity) are: adding direct **quotations** from credible named sources (approximately +27%, the single best lever), adding concrete **statistics** in place of vague claims (+25-37%), and **citing sources** inline (+25%, compounding to +30-40% combined). The rubric below weights toward these: Extractability (answer-first) and Specificity-and-GEO-levers (quotes + stats) carry more weight, because they are what the evidence shows engines actually cite.

## How the subagent uses this prompt

You are scoring ONE post (the file path will be given to you). Read it end-to-end including the `## References` footer. For each of the 6 dimensions below, assign a score from 1 to 10 according to the dimension's own rubric. Compute the weighted total. Check the auto-zero conditions. Output JSON only, no prose preamble, no closing remarks.

**Output schema** (strict, the main agent parses this):

```json
{
  "totalScore": 8.2,
  "dimensions": [
    {
      "name": "Source verification",
      "score": 10,
      "weight": 0.25,
      "notes": "All 7 cited numbers have a matching numbered footnote in ## References. No misattributions."
    },
    { "name": "Voice distinctiveness", "score": 8, "weight": 0.18, "notes": "..." },
    { "name": "Extractability", "score": 7, "weight": 0.20, "notes": "..." },
    { "name": "Citation depth", "score": 9, "weight": 0.12, "notes": "..." },
    { "name": "Specificity & GEO levers", "score": 8, "weight": 0.17, "notes": "..." },
    { "name": "Structure compliance", "score": 10, "weight": 0.08, "notes": "..." }
  ],
  "autoZeros": [],
  "verdict": "pass",
  "iterationsNeeded": []
}
```

- `totalScore` = sum of (score × weight) per dimension. Range 1-10.
- `dimensions[].notes` = 1-3 sentences. Specific. Quote the offending phrase when relevant.
- `autoZeros` = array of strings, one per triggered auto-zero condition (see below). Non-empty = `verdict: 'fail'` regardless of `totalScore`.
- `verdict` = `'pass'` if `totalScore >= 7.5` AND `autoZeros` is empty. Otherwise `'fail'`.
- `iterationsNeeded` = ordered list of concrete fixes the main agent should apply on re-run. Each entry: `"<dimension>: <specific change>"`. Empty on pass.

## Threshold

**`totalScore >= 7.5` = pass.** Below 7.5 OR any auto-zero = fail.

This is a soft gate: the Ethernal pipeline publishes directly to develop with no human review, so a post that can't reach 7.5 after the iteration cap still ships, but the failing score and `iterationsNeeded` are recorded in the run log for follow-up. The gate's job is to *raise* quality via the fix loop, not to silently drop posts. Ratchet the threshold up only after 5-10 calibration posts of data.

## Auto-zero conditions (any one = immediate fail)

Each ships the post with a critical defect no other dimension can compensate for.

1. **Unverified factual claim.** A specific numerical or named-source claim in the body that the source-verification pass (`3b-verify-sources.md`) flagged `drop` or `reattribute` and that wasn't fixed. The humanize phase + verify subagent require every cited number to appear in its source.
2. **Em-dash present in final file.** The blog voice is em-dash-free. The offender is `—` (U+2014); hyphen `-` and en-dash `–` are fine. Run `grep -c "—" <file>` mentally; a non-zero count auto-zeros.
3. **Description >160 chars.** The Zod schema in `blog/src/content.config.ts` hard-fails the build at this length; catch it here so iteration is faster.
4. **`## References` footer missing.** Every Ethernal post must end with a `## References` H2 followed by numbered footnotes in the locked format (`<span id="fn-N">N.</span> Author. "Title." _Source_, Date. [url](url)`), with `<sup>[N](#fn-N)</sup>` inline citations in the body. A post without it auto-zeros.

`autoZeros` array MUST be exhaustive. If multiple conditions fire, list all of them.

## Dimensions

### 1. Source verification — 25%

The single highest-leverage thing to get right. AI-generated copy fails most often on fabricated or misattributed statistics; this dimension is the strongest defense.

| Score | Description |
|---|---|
| 10 | Every cited number / named study / specific stat in the body has a matching numbered footnote in `## References`. The footnote's source supports the body's framing. Zero misattributions. |
| 8 | All numbers cited; 1-2 borderline cases where a number is in the source but the framing is paraphrased slightly. No outright misattributions. |
| 6 | One number can't be located in its cited source on a re-fetch. Either reattribute or remove. |
| 4 | Multiple unverifiable claims OR one named study confabulated. |
| 1 | Numbers throughout the body have no anchor in References, or References lists URLs not actually cited in the body. |

**Score 6 or below on this dimension = treat as if an auto-zero fired** (it's the most consequential failure for GEO; engines cite us based on whether our facts check out).

### 2. Voice distinctiveness — 18%

Does the post sound like Ethernal (em-dash-free, opinionated, concrete, technically precise) or like generic AI-shaped copy? The full banned-word and banned-phrase lists live in `prompts/3-humanize.md` — score against those.

| Score | Description |
|---|---|
| 10 | Zero banned words/phrases from `3-humanize.md` (delve, leverage, robust/seamless/comprehensive as praise, "it's worth noting", "in today's digital landscape", etc.). Zero AI scaffolding tells. No synonym cycling on technical terms (same EIP/protocol/concept name used every time, never rotated through "the proposal"/"the standard"/"the specification"). No promotional adjectives, no forced triads. Sentence-opener distribution healthy. Reads opinionated and specific. |
| 8 | 1-2 minor tells (a single spelled-out percentage, one slightly-flat opener sequence) that don't disrupt voice. |
| 6 | 3-5 detectable tells. A human reader would notice the cumulative effect even if no single one is glaring. |
| 4 | Recurring tells. Voice slides toward generic. |
| 1 | Reads as obviously AI-written. Banned phrases present. Synonym cycling. Promotional adjectives. |

**Specific tells to watch for** (non-exhaustive, read `3-humanize.md` for the full list):

- Conjunctive-adverb openers beyond 1 per 500 words (Additionally, Consequently, Furthermore, Moreover, Notably, However)
- Synonym cycling on a technical term (rotating "the proposal" / "the standard" / "the specification" for the same EIP/ERC)
- Percentages spelled out as words ("forty percent" instead of "40%")
- "X, not Y" constructions where Y is a strawman; "Not only... but..."
- Triadic lists ("clearer, faster, more reliable")
- Significance inflation ("marks a pivotal moment", "stands as a testament")
- Superficial -ing tails ("highlighting/underscoring/emphasizing ...")
- Sentence-opener flatness: 3+ consecutive sentences starting with The/A/An/This/It

### 3. Extractability — 20%

How easy is it for an answer-engine to extract a quotable answer? This is the answer-first dimension, weighted high because position-decay (the engine lifts the *first* clear sentence of a passage) makes it one of the highest-leverage GEO properties.

Check three things: (a) the post-level answer surfaces in the **first 40-60 words**, (b) **each H2 section opens with a self-contained 40-80 word direct answer** before expanding, and (c) at least one explicit `<Term> is <definition>` sentence near the top of the relevant section.

| Score | Description |
|---|---|
| 10 | First 40-60 words contain a tight declarative answer (central claim/verdict, or top pick named). EVERY H2 opens answer-first, takeaway in the opening sentence, not buried below framing. At least one explicit "X is …" definition. Passages self-contained (no "as mentioned above"; key passages name the entity, not a pronoun). For comparison-listicle: up-front verdict in the hook and the item-claim in the H2 + first sentence. |
| 8 | Post-level answer-first present; most sections open answer-first; 1-2 sections bury the takeaway below framing. Definition sentence present. |
| 6 | Hook is curious but doesn't surface the answer until approximately 300 words in, OR several sections open with framing/anecdote before the point. No clear definition sentence. |
| 4 | Buried lede: reader (and extractor) has to skim past anecdote/framing to find the point. |
| 1 | Reads like a continuous essay with no scannable answer-first structure. |

### 4. Citation depth — 12%

| Score | Description |
|---|---|
| 10 | At least 4 primary sources cited (EIPs/ERCs, papers, primary product/protocol docs, named experts). References footer complete. Body cites the source explicitly where contested ("per the EIP-4844 spec", "Vitalik's post argues"). Sources authoritative, not aggregator recaps. URLs stable / archive-friendly. |
| 8 | 3 primary sources, well-cited. 1 borderline aggregator-tier source that's still defensible. |
| 6 | 2-3 sources only, or sources skew aggregator-tier. Body cites inconsistently. |
| 4 | Sources thin (<=2) or one is broken / paywalled / login-gated. |
| 1 | Body lacks specific source attributions, or References contradicts body citations. |

### 5. Specificity & GEO levers — 17%

Combines concrete specificity with the two measured top-3 GEO techniques not covered elsewhere: **direct quotations** and **statistics**.

Score on three things: (a) concrete numbers and named entities throughout, (b) at least one verbatim attributed **quote** from a named primary source, (c) statistics in place of vague adjectives.

| Score | Description |
|---|---|
| 10 | Body uses concrete numbers (gas costs, block sizes, dollar amounts, chain counts), named tools/protocols/people, named EIPs/papers. At least one verbatim quote (<=2 sentences) from a named credible source (core dev, auditor, protocol author, Vitalik), attributed inline. Statistics replace adjectives wherever a number exists. Zero filler quantifiers ("many", "various", "some", "often"). |
| 8 | Mostly specific; has either a strong quote OR strong stats but not both at full strength; 1-3 mild filler quantifiers where a number would be awkward. |
| 6 | Recurring vague quantifiers. Numbers present but mixed with "studies have shown" framing. No verbatim quote from a named source. |
| 4 | Sparse on specifics. No quotes. Body could be about any chain in any ecosystem. |
| 1 | Generic throughout. Adjectives where numbers belong. |

**Don't reward fabricated specifics.** A "specific" number that's actually unverifiable hits auto-zero on dimension 1, not a boost here. A fabricated quote is an auto-zero (unverified claim), never a boost.

### 6. Structure compliance — 8%

The smallest weight because the build step + earlier prompts enforce most of this. This dimension catches what slips past Zod (which only validates frontmatter).

| Score | Description |
|---|---|
| 10 | Content-type structure matches the declared Content Type (see `2-draft.md`). For Comparison Listicle: per-item H2 sections, a comparison table near the top, a decision framework, and "Last updated: <Month Year>" under the title. For explainer/deep-dive types: clear H2 sectioning, answer-first leads, code blocks where relevant. All: `## References` footer immediately before file ends with the locked footnote format. |
| 8 | Structure correct; minor variance on 1 section (e.g. one section thinner than the rest). |
| 6 | Section count borderline, or a comparison-listicle missing its comparison table. |
| 4 | Wrong structure for the declared contentType. |
| 1 | No discernible structural pattern. |

## How to score (quick checklist for the subagent)

1. **Read the file end-to-end.** Including the References footer.
2. **Auto-zero pass first.** Run the 4 checks in order. If any fires, note it in `autoZeros[]` and still score the 6 dimensions (so the main agent can fix the auto-zero AND raise scores in one re-run).
3. **Score each dimension 1-10** against its rubric. Quote specific phrases in `notes` where relevant.
4. **Compute `totalScore`** as the weighted sum. Round to one decimal.
5. **Verdict.** Pass if `totalScore >= 7.5` AND `autoZeros` is empty.
6. **`iterationsNeeded`** — ordered list, highest-impact fix first. Empty on pass.
7. **Output the JSON only.** No prose framing, no "Here is the score:", start with `{`.

## Threshold ratchet roadmap

- **First ratchet** (after 5 posts scored): if median post score >= 8.0, raise threshold to 7.8.
- **Second ratchet** (after 10 total posts): if median >= 8.3, raise to 8.0.

Don't ratchet preemptively. A handful of posts isn't enough to distinguish "we got better" from "we got lucky."
