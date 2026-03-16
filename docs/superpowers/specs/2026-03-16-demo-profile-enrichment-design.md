# Demo Profile Enrichment Pipeline

## Problem

The drip email campaign sends the same generic social proof and feature messaging to every demo creator, regardless of who they are or what they're building. We have two signals at creation time (email address and RPC URL) that can identify the company and tailor messaging to their specific use case.

## Solution

At demo creation time, enqueue an async `enrichDemoProfile` job that researches the company via linkup.so and generates personalized email copy via Claude API. Store the result on the explorer. Steps 3-6 emails read enrichment data and use it, falling back to generic copy if unavailable.

## Domain Resolution

The enrichment job resolves a company domain from two signals, in priority order:

1. **Email domain** (e.g., `john@acmelabs.xyz` -> `acmelabs.xyz`). If it's a free email provider, fall through.
2. **RPC URL domain** (e.g., `https://rpc.acmelabs.xyz/v1` -> `acmelabs.xyz`). If it's a public RPC provider, skip enrichment.

**Free email providers to skip**: Use the `free-email-domains` npm package for comprehensive coverage. Supplement with a small local list for any domains it misses. False negatives (treating a free email as corporate) are acceptable since they only waste an API call.

**Public RPC providers to skip**: `ankr.com`, `infura.io`, `alchemy.com`, `publicnode.com`, `chainstack.com`, `quicknode.com`, `drpc.org`, `blast.io`, `tenderly.co`, `llamarpc.com`, `1rpc.io`, `rpc.sepolia.org`

If no usable domain can be resolved, skip enrichment entirely. The emails use their existing generic fallback copy.

## Data Flow

```
Demo created (POST /api/demo/explorers)
  |-- enqueue sendDripEmail step 1 (instant, independent)
  |-- enqueue enrichDemoProfile (async, independent)
  \-- create drip schedule (6 rows as today)

enrichDemoProfile job:
  1. Resolve company domain from email, then RPC URL
  2. If no domain -> exit (no enrichment)
  3. Check domain cache: if same domain was enriched in last 7 days, reuse it
  4. Call linkup.so: search for company info (what they do, blockchain/web3 context)
  5. Call Claude API (tool_use mode): generate personalized snippets from research
  6. UPDATE explorers SET enrichment = {result} WHERE id = explorerId

sendDripEmail (step 3+):
  1. Load explorer.enrichment from DB at send time (not from job payload)
  2. Map enrichment fields to template params (enrichment.companyContext -> teamContext)
  3. Pass to getEmailContent() which falls back to generic defaults if null
```

**Important**: `sendDripEmail` always loads enrichment fresh from the DB at send time. This is critical because step 1 is enqueued before enrichment finishes. By step 3 (24h later), enrichment will be available.

## Enrichment Data Schema

New nullable JSON column `enrichment` on the `explorers` table:

```json
{
  "companyName": "Acme Labs",
  "companyDomain": "acmelabs.xyz",
  "source": "email",
  "companyDescription": "Building a DeFi lending protocol on Arbitrum",
  "companyContext": "As a DeFi team building on Arbitrum, you need real-time visibility into contract interactions, token flows, and transaction decoding to debug and monitor your lending pools.",
  "tailoredBenefits": "For lending protocols, the most impactful features are decoded transaction traces (see exactly how funds flow through your contracts), verified contract source code (your users can read the ABI directly), and historical sync (backfill your full deployment history).",
  "urgencyHook": "Your lending protocol explorer has been tracking contract interactions and token transfers since you deployed. Losing this visibility mid-development means debugging blind.",
  "enrichedAt": "2026-03-16T10:00:00Z"
}
```

If enrichment fails:
```json
{
  "companyDomain": "acmelabs.xyz",
  "source": "email",
  "error": "linkup_timeout",
  "enrichedAt": "2026-03-16T10:00:00Z"
}
```

When an explorer is deleted (after grace period), the enrichment data is deleted with it since it lives on the `explorers` row.

## Domain-Level Caching

Multiple demo explorers may come from the same company domain. To avoid redundant API calls:

- Before calling linkup.so, check if any explorer with the same `enrichment->>'companyDomain'` was enriched in the last 7 days.
- If found, copy the enrichment JSON to the new explorer and skip external API calls.
- Query: `SELECT enrichment FROM explorers WHERE enrichment->>'companyDomain' = $1 AND enrichment->>'error' IS NULL AND enrichment->>'enrichedAt' > NOW() - INTERVAL '7 days' LIMIT 1`

## How Enrichment Plugs Into Emails

| Step | Enrichment field | Maps to template param | Where it appears | Fallback (when enrichment is null) |
|------|-----------------|----------------------|-----------------|----------|
| 1 | none | N/A | Plain text, transactional | N/A |
| 2 | none | N/A | Explorer link, activity | N/A |
| 3 | `tailoredBenefits` | `tailoredBenefits` | New paragraph above comparison table | No extra paragraph, table only |
| 4 | `companyContext` | `teamContext` (existing param) | Replaces generic social proof paragraph | "Teams building EVM-based chains use Ethernal..." |
| 5 | `urgencyHook` | `urgencyHook` | Replaces generic trial paragraph | "Start your 7-day free trial now to keep your explorer running..." |
| 6 | `urgencyHook` | `urgencyHook` | Replaces generic expired paragraph | "We are keeping your configuration for 48 hours..." |

The mapping from enrichment field names to existing template parameter names happens in `sendDripEmail.js`, keeping the content templates clean.

## New Files

- `run/jobs/enrichDemoProfile.js` -- the enrichment job
- `run/lib/enrichment.js` -- domain resolution, free email/public RPC lists, linkup.so client, Claude API prompt
- `run/migrations/YYYYMMDD-add-enrichment-to-explorers.js` -- add nullable JSON column

## Modified Files

- `run/api/demo.js` -- enqueue `enrichDemoProfile` alongside step 1 email (inside the `isDripEmailEnabled()` block, non-blocking)
- `run/jobs/index.js` -- register `enrichDemoProfile`
- `run/workers/priorities.js` -- add `enrichDemoProfile` to low priority
- `run/jobs/sendDripEmail.js` -- for steps 3+, load `explorer.enrichment` from DB and map to template params
- `run/emails/drip-content.js` -- steps 3-5 use new params with fallback to existing defaults
- `run/models/explorer.js` -- add `enrichment` field to model

## Linkup.so Integration

Search query template:
```
"What does {domain} do? Include any blockchain, web3, DeFi, or crypto context."
```

We extract a text summary from the search results. If linkup returns nothing useful, we store an error and move on.

If linkup.so fails (timeout, 5xx, DNS, no results), store an error and skip enrichment. Emails use generic fallback copy.

**API key**: Store as `LINKUP_API_KEY` env var. Add getter to `run/lib/env.js`.

## Claude API Integration

Use `tool_use` mode to guarantee structured JSON output.

Prompt template (input: linkup research + email domain + networkId):
```
You are writing personalized email copy for Ethernal, a block explorer for EVM chains.

Company domain: {domain}
Chain network ID: {networkId}
Research: {linkupResults}

Generate three short snippets (2-3 sentences each). Be factual, do not invent details not supported by the research. If the research is thin, keep the copy general but still reference their domain.
```

Tool definition for structured output:
```json
{
  "name": "save_enrichment",
  "description": "Save personalized email copy snippets",
  "input_schema": {
    "type": "object",
    "required": ["companyName", "companyDescription", "companyContext", "tailoredBenefits", "urgencyHook"],
    "properties": {
      "companyName": { "type": "string", "description": "Company name derived from research" },
      "companyDescription": { "type": "string", "description": "One-line description of what the company does" },
      "companyContext": { "type": "string", "description": "Social proof paragraph addressing them directly. Start with 'As a team building X...'. Explain why they need a block explorer." },
      "tailoredBenefits": { "type": "string", "description": "Which Ethernal features matter most for their use case and why." },
      "urgencyHook": { "type": "string", "description": "Make the cost of losing their explorer data concrete and specific to their use case." }
    }
  }
}
```

**Model**: `claude-haiku-4-5-20251001` (fast, cheap, good enough for short copy generation)

**Auth**: Uses a Claude Code OAuth token (`sk-ant-oat01-...`) stored in `CLAUDE_API_KEY` env var, same pattern as the blog pipeline. The token works as a standard `x-api-key` header with the Anthropic Messages API. Uses the Claude subscription (not API billing). Call the API directly via `@anthropic-ai/sdk` (add as a backend dependency) or raw HTTP. Add `getCloudeApiKey` getter to `run/lib/env.js`.

## Cost Controls

- **Domain caching**: Same domain enriched in last 7 days reuses cached result (no API calls)
- **Skip free email + public RPC**: No job enqueued at all
- **BullMQ rate limiter**: Configure enrichDemoProfile queue with `limiter: { max: 60, duration: 3600000 }` (max 60 enrichments per hour)
- **No auth on demo creation endpoint**: Rate limiting at the job queue level prevents abuse. The demo creation endpoint itself already has RPC validation (fetches networkId) which acts as a natural rate limiter.

## Failure Handling

| Failure | Behavior |
|---------|----------|
| Free email + public RPC | Skip enrichment, no job enqueued |
| Linkup.so timeout (30s), 5xx, or no results | Store `{ error: "linkup_failed" }`, emails use generic |
| Claude API fails | Store `{ error: "generation_failed" }`, emails use generic |
| Enrichment job crashes | BullMQ retries (low priority, 10 attempts). Emails still work without enrichment. |
| Explorer deleted before enrichment completes | Job exits gracefully (explorer not found) |
| Malformed Claude response | tool_use mode guarantees JSON schema. If tool call missing, treat as Claude failure. |

## Env Vars

| Var | Purpose |
|-----|---------|
| `LINKUP_API_KEY` | Linkup.so API authentication |
| `CLAUDE_API_KEY` | Claude Code OAuth token (`sk-ant-oat01-...`) for copy generation. Same token as the blog pipeline. Uses Claude subscription, not API billing. |

Add getters to `run/lib/env.js`. Enrichment is optional: if the keys aren't set, the job logs a warning and exits. This does NOT affect `isDripEmailEnabled()` -- drip emails work without enrichment.

## Testing

- `run/tests/lib/enrichment.test.js` -- domain resolution (free email skip, RPC fallback, public RPC skip, domain caching)
- `run/tests/jobs/enrichDemoProfile.test.js` -- mock linkup + Claude, verify storage, verify failure handling
- Existing `sendDripEmail` tests updated to verify enrichment-to-template mapping and fallback when enrichment is null
