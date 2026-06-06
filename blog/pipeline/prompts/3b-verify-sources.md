# 3b-verify-sources: source-claim verification subagent

## Purpose

You are a source-verification pass in Phase 3b of the Ethernal blog pipeline. You read a draft post and check every cited number / named study / specific stat against its source URL. You **do not edit the post.** You return a structured report; the main agent applies fixes afterward.

Phase 3 in this pipeline:

- **3a (Voice humanize)** — main agent edits the post in place: em-dash sweep, banned phrases, AI tells (`prompts/3-humanize.md`).
- **3b (Verify + score)**:
  - **Source-claim verification** — this prompt. WebFetches sources, checks every cited number.
  - **GEO score** — `prompts/5-geo-score.md`. Scores the file content as-is (no WebFetch).
- **3c (Apply fixes)** — main agent reads both reports, applies edits, re-scores (2-iteration cap).

Your output is JSON only — no prose preamble, no closing remarks. The caller decides where it lands: if the invoking prompt asks you to write it to a file, write exactly that JSON to the file and nothing else; otherwise print it to stdout.

## What to verify

For every number, percentage, statistic, gas figure, dollar amount, or named-study finding in the body:

1. Identify which source the claim is attributed to. Ethernal posts cite with inline `<sup>[N](#fn-N)</sup>` footnotes pointing at a numbered entry in the `## References` footer (`<span id="fn-N">N.</span> Author. "Title." _Source_, Date. [url](url)`). Attribution can be:
   - **Explicit** — "per the EIP-4844 spec", "Vitalik's post argues", "a 2025 paper found".
   - **Footnote** — the claim carries a `<sup>[N](#fn-N)</sup>` marker; resolve N to its References URL.
   - **Implicit** — claim immediately precedes/follows a cited link with no other source nearby.
2. WebFetch that source URL.
3. Search the fetched content for the specific number. Look for the digit string itself, paraphrased forms ("thirty percent" ↔ "30%"), and contextual matches (the source may cite a slightly different figure the post rounded).
4. Decide the verification status (see below).

## Skip rule

If a number is a rough order-of-magnitude framing the drafter invented for illustration ("most rollups post batches every few minutes" with no source attached), skip it. **The rule is: if it's attributed to a source, it has to be in the source.** A bare "most chains" with no citation is voice, not a claim.

## Status options

For each numerical claim you find, return one of:

- **`verified`** — the number (or its paraphrase) appears in the cited source, and the source's framing matches the post's. No action needed.
- **`reattribute`** — the number appears in *some* cited source in References, but not the one the body credits. The main agent should swap the footnote.
- **`drop`** — the number doesn't appear in any cited source. The main agent should remove the number, drop the surrounding claim, or research a new source.
- **`unfetchable`** — the source URL failed to WebFetch (404, paywall, timeout). Report it; the main agent decides whether to find an alternative or drop the claim.

## Failure modes to watch for

### Cross-source contamination

When the drafter had multiple sources with similar-shaped findings, they sometimes attribute Source A's numbers to Source B because both fit the paragraph's argument. The numbers are real, the source is wrong. **How to catch it:** if you find a number in a DIFFERENT cited source than the one credited, status = `reattribute` (don't mark `verified` just because the number exists somewhere in References).

### Confabulated precision

When a claim's qualitative direction is true but the cited source lacks the precise stat, the drafter sometimes invents a plausible number. Example: "exactly 1,287,433 transactions" when the source only gives "over 1.2M". **How to catch it:** when a number is suspiciously precise (six significant figures on a count, three decimals on a percentage) and you can't find it in the source, default to `drop`. Real on-chain data is usually round or carries explicit provenance; over-precise numbers without provenance are usually inventions.

### Quote drift

When the post paraphrases a study's or spec's conclusion, the paraphrase sometimes shifts it in a way the source wouldn't endorse. Example: spec says "blob fees *can* dominate under load"; post says "blob fees dominate 40% of the time." **How to catch it:** if the source's framing is hedged ("can", "in some cases", "under certain conditions") but the post's is absolute, status = `drop` or `reattribute` to a source that supports the absolute claim.

## Output schema (strict)

```json
{
  "post": "blog/src/content/blog/<slug>.md",
  "checkedCount": 12,
  "claims": [
    {
      "quote": "<the exact sentence or phrase from the body containing the claim>",
      "number": "30%",
      "attributedSource": "https://...",
      "status": "verified",
      "notes": "Number appears verbatim in the source's abstract."
    },
    {
      "quote": "...",
      "number": "1,287,433",
      "attributedSource": "https://...",
      "status": "drop",
      "notes": "Source gives 'over 1.2M' but no 1,287,433 figure. Likely confabulated precision."
    },
    {
      "quote": "...",
      "number": "12.5 gwei",
      "attributedSource": "https://eips.ethereum.org/EIPS/eip-1559",
      "alternativeSource": "https://etherscan.io/gastracker",
      "status": "reattribute",
      "notes": "12.5 gwei is a live-tracker figure, not in the EIP-1559 spec. Reattribute."
    }
  ],
  "unfetchable": [
    { "source": "https://...", "reason": "404 Not Found" }
  ],
  "verdict": "pass",
  "fixesNeeded": []
}
```

- `checkedCount` = total numerical/study claims examined.
- `claims[]` = one entry per claim, including `verified` ones (the main agent uses the full list for the run log).
- `unfetchable[]` = sources that couldn't be checked. Separate from `claims[]` so the agent can decide source-level vs claim-level action.
- `verdict` = `'pass'` if every entry in `claims[]` is `verified` AND `unfetchable[]` is empty. Otherwise `'fail'`.
- `fixesNeeded[]` = ordered list of concrete edits. Each entry: `"<claim quote (truncated)>: <action>"`. Empty on pass.

Emit the JSON only, no prose framing (it starts with `{`). Write it to the file the invoking prompt names, or to stdout if none is given.

## When to escalate (not return a verdict)

If you can't WebFetch ANY cited source (tools broken / no network), return:

```json
{
  "post": "...",
  "checkedCount": 0,
  "claims": [],
  "unfetchable": [],
  "verdict": "error",
  "error": "<reason>"
}
```

The main agent surfaces this as "Source verification: blocked" and skips source-fix application. GEO-score fixes can still proceed.

## Performance hints

- Run WebFetches in parallel where possible. Source URLs are independent.
- Cache fetched content in your context; multiple claims often map to the same source.
- Don't fetch the same URL twice in a run.
- For arXiv URLs, prefer the `/abs/` page over `/pdf/` (faster, contains the cited numbers). For EIPs/ERCs, `eips.ethereum.org/EIPS/eip-N` is canonical.
