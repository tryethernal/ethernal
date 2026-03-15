# Marketing Pipeline Design: Conversion Engine + Content Flywheel

**Date:** 2026-03-15
**Status:** Approved
**Branch:** `feature/blog-stack`

## Problem Statement

Two independent problems to solve in parallel:

1. **Conversion is zero.** 787 demo explorer creations in the last 3 months, 0 migrations to paid, 0 subscriptions. The only touchpoints are one automated welcome email (Mailjet) and a banner at the top of demo explorers. Manual email outreach is not yielding results.

2. **Traffic dropped ~95%.** Signups went from ~160/week (Dec-Jan) to ~5-15/week (Feb-Mar). No social media presence beyond a dormant Twitter account (@tryethernal, ~218 followers). Blog produces content but is not amplified.

## Goals

- **Primary (A):** Increase developer signups and demo-to-paid conversion
- **Secondary (C):** Drive organic traffic via SEO (blog pipeline already handles this)
- **Tertiary (D):** Build community / Twitter following
- **Quaternary (B):** Establish thought leadership

## Solution: Three Components

### Component 1: Conversion Engine (Email Drip + 7-Day Demo)

#### Demo Expiration Change

Extend demo explorer lifetime from 1 day to 7 days.

- **Change location:** `StripePlan.capabilities.expiresAfter` for the demo plan
- **Rationale:** 24h is too short for users to experience value, show their team, or respond to follow-up emails. 7 days aligns with the trial period after migration.
- **Cost impact:** Minimal. Demo explorers have 1-day data retention limit, so storage is negligible.

#### BullMQ Drip Sequence (6 emails via Mailjet)

| # | Timing | Subject Style | Content |
|---|--------|--------------|---------|
| 1 | Instant (existing) | "Your Ethernal demo explorer is ready" | Explorer link + what they can do right now |
| 2 | +6 hours | "Your explorer synced X blocks" | Prioritize by activity value: (1) token transfers if present, (2) transactions with special activity (fn calls, ETH transfers), (3) blocks with link to a relevant transaction. Highlight the most interesting on-chain activity. |
| 3 | +24 hours | "Here's what you're missing on [chain]" | Feature comparison: demo vs. paid (branding, custom domain, historical sync, DEX) |
| 4 | +72 hours (day 3) | "Teams using Ethernal on [similar chain]" | Research the team/company via linkup.so API (enrich from email domain): what they build, what chain ecosystem they're in, what similar customers look like. Personalize with relevant use cases and social proof matching their profile. |
| 5 | +120 hours (day 5) | "Your explorer expires in 2 days" | Urgency + one-click migration CTA + what happens when it expires |
| 6 | +168 hours (day 7) | "Your demo expired -- but your data doesn't have to" | Post-expiration win-back, offer to restore if they sign up within 48h. **Backend work required:** Currently `removeExpiredExplorers` job queues workspace for deletion immediately on expiry. Need a grace period: on expiry, set explorer to inactive/hidden (not public, syncing paused) but defer actual deletion by 48h. New flag `pendingGracePeriod` or extend `pendingDeletion` with a `deleteAfter` timestamp. |

#### Implementation

**Database-driven scheduler** (not individual delayed jobs, to survive Redis restarts and allow schedule changes):

- **New table:** `demo_drip_schedules` -- columns: `id`, `explorerId`, `email`, `step` (1-6), `sendAt` (timestamp), `sentAt` (nullable), `skipped` (boolean), `createdAt`
- **On demo creation:** Insert 6 rows with pre-calculated `sendAt` timestamps. This replaces 6 individual BullMQ delayed jobs.
- **New recurring job:** `run/jobs/processDripEmails.js` -- runs every 15 minutes via BullMQ repeatable job. Queries for rows where `sendAt <= now() AND sentAt IS NULL AND skipped = false`. For each, checks if user already migrated (`isDemo: false`) -- if so, marks `skipped = true`. Otherwise, sends email and sets `sentAt`.
- **Benefits:** Survives Redis flushes/restarts. Schedule changes apply to all in-flight demos. Easy to query/debug. No phantom jobs.
- **Migration:** New Sequelize migration for `demo_drip_schedules` table.
- **Mailjet webhooks:** New endpoint `POST /api/webhooks/mailjet?token=<secret>` to track opens/clicks. Secret token configured in Mailjet webhook URL and validated on receipt.
- **Email templates:** `run/emails/` directory. Email #1 stays plain text (personal feel for welcome). Emails #2-6 use a branded HTML template with: Ethernal logo header, dark theme (#1a1a2e background, #3D95CE accent), CTA buttons, feature screenshots/comparisons where relevant, and footer with unsubscribe link + social links. Each HTML email includes a plain text fallback (Mailjet generates automatically). One shared base template (`run/emails/base.html`) with per-email content blocks injected via Mailjet template variables.
- **Unsubscribe:** New endpoint `GET /api/demo/unsubscribe?token=<encrypted>` -- marks all pending drip rows as `skipped = true` for that email.
- **Tracking:** PostHog events `email:drip_sent`, `email:drip_opened`, `email:drip_clicked` with `{step, explorerSlug}` (no raw email addresses sent to PostHog, use explorerSlug as identifier)

### Component 2: Twitter Pipeline

#### Architecture

Mirrors the blog pipeline: systemd timer on Hetzner, Claude generates content, post via Twitter API v2.

```
Trend Scanner (existing)          Blog Pipeline (existing)
    | scored items                     | published articles
    v                                  v
+---------------------------------------------+
|           Tweet Pipeline (new)              |
|                                             |
|  1. Source Selector                         |
|     -> pick from: trend scanner items,      |
|       new blog posts, EIP/ERC feeds         |
|                                             |
|  2. Claude Draft (3-phase)                  |
|     -> research -> draft -> humanize        |
|     -> outputs: tweet text + image spec     |
|                                             |
|  3. Image Generator                         |
|     -> branded templates -> Playwright render|
|     -> or Playwright screenshot              |
|     -> or existing blog cover image         |
|                                             |
|  4. Queue & Publish                         |
|     -> store in tweet queue (JSON files)    |
|     -> post via Twitter API v2 on schedule  |
|     -> 5x/day, spaced ~3h apart            |
+---------------------------------------------+
```

#### Content Buckets (5 tweets/day)

| Slot | Base Time (UTC) | Jitter | Bucket | Source |
|------|----------------|--------|--------|--------|
| 1 | 07:00 | +/-30 min | Ecosystem news | Trend scanner: ethresear.ch, Magicians, arXiv |
| 2 | 10:00 | +/-30 min | EIP/ERC commentary | Trend scanner: EIP/ERC PRs |
| 3 | 13:00 | +/-30 min | Product tip / Ethernal feature | Pre-defined feature list + demo explorer |
| 4 | 16:00 | +/-30 min | Blog repurposing | Latest published blog articles |
| 5 | 19:00 | +/-30 min | Hot take / contrarian opinion | Trend scanner highest-scored items |

Random offset calculated at queue time (`scheduledAt = baseTime + random(-30, +30) minutes`). Publisher cron runs every 10 minutes and posts anything past its `scheduledAt`.

#### Tweet Generation (3-phase)

**Phase 1 -- Research** (`prompts/tweet-1-research.md`)
- Takes source item (trend scanner entry, blog post, or feature)
- WebSearches for latest context, reactions, counter-arguments
- Outputs `.tweet-research.md`

**Phase 2 -- Draft** (`prompts/tweet-2-draft.md`)
- Reads research notes
- Applies viral style rules (see Style Rules section below)
- Outputs tweet text (hook + thread if >280 chars) + image spec JSON
- For threads: max 4 replies, each 140-200 chars

**Phase 3 -- Humanize** (`prompts/tweet-3-humanize.md`)
- Strips AI-isms, ensures lowercase casual voice
- Validates: has $ amount or specific number in hook? Short sentences? Line breaks?
- Rejects and re-drafts if it reads like corporate/AI

#### Viral Tweet Style Rules

Extracted from analysis of high-performing tweets (@RetroValix, @TheMattBerman, @DeRonin_, @0xCristal, @ventry089):

```
1. HOOK: First line must have a $ amount OR a shocking metric. Always.
2. FORMAT: Lowercase casual. Short sentences. Line break after every thought.
3. STRUCTURE: Hook -> "here's how" / "the secret:" -> numbered steps or -> arrows
4. SPECIFICITY: Use precise numbers (not "lots of" but "273 per hour")
5. VOICE: First person "I" or third person story "This [person] did X"
6. CONTRAST: Old expensive/manual way vs. new cheap/automated way
7. THREAD: End with a tease (down arrow, "here's the system:", ...)
8. NO: Corporate voice, emoji overload, generic advice, hashtags
9. MENTION: Tag relevant tools/protocols when natural
10. LENGTH: Hook tweet 200-280 chars. Thread replies 140-200 chars each.
```

**Reference tweets analyzed:**
- @RetroValix: "This trader made $178,000 on Polymarket using software, buying markets for $4.6..."
- @TheMattBerman: "this @openclaw agent replaced my $8K/month content strategist for $30..."
- @DeRonin_: "I run 10 social media accounts and don't write a single post manually..."
- @0xCristal: "+$10.22K Every Day thanks to OpenClaw!..."
- @ventry089: "This is the first time i made money in my sleep..."

#### Image Generation

Every tweet must have an image. The image is part of the hook.

**Image types:**

| Type | Use Case | Method |
|------|----------|--------|
| `stat_card` | Big number + subtitle | HTML template -> Playwright -> PNG |
| `eip_card` | EIP/ERC number + title + summary | HTML template -> Playwright -> PNG |
| `code_snippet` | Syntax-highlighted code block | HTML template -> Playwright -> PNG |
| `quote_card` | Pull quote + attribution | HTML template -> Playwright -> PNG |
| `ui_screenshot` | Ethernal feature in action | Playwright on demo explorer -> PNG |
| `blog_cover` | Blog article visual | Existing cover image from article |

**Template specs:**
- 4 branded HTML/CSS templates
- Dark background, #3D95CE accent (Ethernal brand colors)
- Rendered at 1200x675px PNG (Twitter optimal)
- Templates accept dynamic data via JSON: title, stat, quote, code snippet

**Phase 2 outputs image spec:**
```json
{
  "type": "stat_card",
  "headline": "273 trades/hour",
  "subtitle": "How one bot arbitrages Polymarket"
}
```

Image generator picks the right template and renders it.

#### Queue & Publishing

- Generated tweets stored as JSON in `tweet-queue/` on server
- Each file: `{text, thread[], imageSpec, imagePath, bucket, sourceId, scheduledAt}`
- Publisher cron runs every 10 min, posts anything past `scheduledAt`
- Posts via Twitter API v2 (`POST /2/tweets` with media upload via `POST /1.1/media/upload`)
- Logs results, stores tweet IDs for engagement tracking

#### File Structure

Location: `tweet-pipeline/` at repo root (sibling to `blog/`).

```
tweet-pipeline/
|-- config.js              # API keys, schedule, bucket config
|-- draft.sh               # Main script (like blog/pipeline/draft.sh)
|-- publish.sh             # Cron publisher
|-- prompts/
|   |-- tweet-1-research.md
|   |-- tweet-2-draft.md
|   +-- tweet-3-humanize.md
|-- templates/
|   |-- stat-card.html
|   |-- eip-card.html
|   |-- code-snippet.html
|   +-- quote-card.html
|-- lib/
|   |-- twitter.js         # Twitter API v2 client
|   |-- image-generator.js # Template -> Playwright -> PNG
|   +-- source-selector.js # Pick from trend scanner/blog/features
+-- tweet-queue/           # Generated tweets waiting to post
```

#### Server Setup

- Same Hetzner box (157.90.154.200), same `blog` user
- New systemd timers: `tweet-draft.timer` (5x/day) + `tweet-publish.timer` (every 10 min)
- Env vars added to `/home/blog/.blog-pipeline.env`: `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_SECRET`
- **Twitter API tier: Basic ($100/month).** Free tier does not support media upload or read endpoints. Basic tier required for: image upload (`POST /1.1/media/upload`), engagement metrics (`GET /2/tweets` with `public_metrics`), and 3,000 tweets/month quota.

### Component 3: Tracking & Flywheel

#### PostHog Events (new)

**Conversion funnel:**
- `email:drip_sent` -- `{step, explorerSlug, email}`
- `email:drip_opened` -- via Mailjet webhook
- `email:drip_clicked` -- via Mailjet webhook
- `explorer:demo_expired` -- when cleanup job runs

**Twitter:**
- `twitter:tweet_posted` -- `{tweetId, bucket, sourceId, hasThread}`
- `twitter:tweet_engagement` -- `{tweetId, likes, retweets, replies, views}` (polled daily via bridge script)

#### Twitter-to-PostHog Bridge

Daily cron job:
1. Calls Twitter API v2 `GET /2/tweets?ids=...&tweet.fields=public_metrics`
2. Gets `{like_count, retweet_count, reply_count, impression_count}` per tweet
3. Sends as PostHog events via PostHog API (`posthog.capture('twitter:tweet_engagement', {...})`)
4. **Sliding window:** Only polls tweets from the last 30 days (not all time)
5. **Batching:** Twitter API limits `ids` param to 100 per request. Batch in chunks of 100.

This puts all metrics (demo funnel, email drips, Twitter engagement) in one PostHog dashboard.

#### Blog-to-Twitter Flywheel (automatic)

1. `blog-publish.yml` fires on new article publish
2. Workflow sends webhook (HTTP POST) to Hetzner server with article slug
3. Hetzner receives webhook via a lightweight listener, triggers tweet generation for that article
4. Pipeline generates 3-5 tweets from article (key stats, quotes, thread summary)
5. Tweets queued spread over next 48h to avoid flooding

#### Twitter-to-Blog Flywheel (future, phase 2)

1. Daily cron polls Twitter API for engagement on last 7 days of tweets
2. Tweets with >95th percentile engagement get their `sourceId` flagged
3. Trend scanner score for that topic gets a boost multiplier
4. High-boosted topics surface as blog article candidates

#### PostHog Dashboard

Unified dashboard combining:
- Demo creation -> drip open -> drip click -> migration funnel
- Tweets posted per day / engagement trend
- Blog publish -> tweet -> engagement correlation

## Dependencies

- **Twitter API v2 Basic tier ($100/month):** Need to apply for developer account, get API keys, subscribe to Basic plan. Required for media upload and engagement metrics.
- **Mailjet webhook setup:** Configure Mailjet to POST open/click events to `POST /api/webhooks/mailjet?token=<secret>`
- **Playwright on server:** For both HTML template rendering and UI screenshots (single browser engine, replaces Puppeteer)

## Out of Scope

- Cross-posting to LinkedIn, Farcaster, dev.to (future)
- Programmatic SEO pages (future)
- In-app onboarding wizard beyond existing banner/modal
- Screen Studio video recordings (deferred)
- Complex email branching logic (if opened but not clicked, send variant B)
