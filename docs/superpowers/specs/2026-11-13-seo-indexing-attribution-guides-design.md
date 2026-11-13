# SEO indexing fixes, snippet rewrites, signup attribution, setup guides

Date: 2026-11-13. Follows the blog-pipeline wind-down (#1409).

## Evidence (Google Search Console, PostHog, live site; 2026-11-13)

- **Only 23 of 49 landing sitemap URLs are indexed.** 19 are "URL is unknown to Google" (e.g. `/op-stack`,
  `/build-vs-buy-block-explorer`, `/chains/base`, `/tools/4byte-lookup`) and 5 are "Discovered, not indexed"
  (`/arbitrum-orbit`, `/app-chains`, `/transaction-tracing`, ...), 8 months after launch, despite homepage links and a
  submitted sitemap.
- **Every unknown URL on the apex returns 200 with the homepage** (`/this-page-does-not-exist`, `/chains/nope`) and
  `/blog/<missing>` returns the blog index: site-wide soft 404s. `/ingest` (the PostHog proxy) is indexed.
- **`www.tryethernal.com` serves full duplicates** (200, canonical points to apex). Google picked the www copy as
  canonical for `/chains/optimism` and `/chains/zora`.
- **`/app-chains` returns 502**: Caddy's `handle /app*` (Soketi websocket route) also matches `/app-chains`.
- **Snippets**: the June CTR sprint (#1327/#1328) already rewrote these titles; CTR did not move. Part of the
  impressions are synthetic (e.g. "tryethernal" at position 1.0, 3,416 impressions, 0 clicks), so CTR targets are
  modest. Real issues remain: the homepage and `/launch-block-explorer` compete for the same hosting queries, and
  `/etherscan-alternative` gets list-intent queries ("what are alternatives to etherscan?", "etherscan alternatives")
  with a title that promises a single product.
- **The app sends zero events to PostHog** since 2026-03-04 (#4f58125 moved the app build from Netlify to
  `Dockerfile.caddyfile`, dropping `VITE_POSTHOG_API_KEY`/`VITE_POSTHOG_API_HOST`). `posthog.identify()` never runs, so
  no landing/blog visit can ever be joined to a signup (0 of 59 signups in 90 days have any frontend event).
- **Demand for guides** (GSC, 6 months): "create a block explorer" 186 impr (homepage, pos 19), "how to build block
  explorer" 45, "host your own block explorer" 222 + "host your own explorer" 114, "launch custom block explorer"
  1,262. Google Ads volumes are bucketed to ~0 for these, so GSC is the demand signal.

## Scope

### A. Technical indexing fixes (Caddy + landing/blog)

1. **Real 404s on the apex.** Remove the `/index.html` fallback from the landing and blog `try_files`. Unknown paths
   under `tryethernal.com` return HTTP 404 with a proper page:
   - landing: new route `/404` → `landing/src/pages/NotFoundPage.vue` (noindex meta, links to home, pricing, guides,
     launch page). vite-ssg emits it; Caddy serves whichever of `/404.html` or `/404/index.html` exists.
   - blog: `blog/src/pages/404.astro` (noindex), emitted as `/srv/blog/404.html`.
   - Caddy: a `handle_errors 404` block in `(common)`, restricted with a host matcher to `tryethernal.com` /
     `www.tryethernal.com`, rewriting `/blog*` misses to the blog 404 and everything else to the landing 404, served
     with status 404. Explorer subdomains, custom domains and `app.` keep their SPA fallback unchanged.
   - Existing redirects (`/blog/tag/*`, Lisk, `/blog/cdn-cgi/*`) keep working.
2. **www → apex.** `www.tryethernal.com/*` 301s to `https://tryethernal.com{uri}`.
3. **Websocket route.** `handle /app*` becomes a matcher for exactly `/app` and `/app/*` (still `handle`, not
   `handle_path`: the `/app` prefix must be preserved for Pusher, see CLAUDE.md). `/app-chains` then serves the
   landing page.
4. **robots.txt** (landing): `Disallow: /ingest`.
5. **app.tryethernal.com** landing redirects: add `/guides*` (new section) to the prefix list.

### B. Snippet rewrites (landing pages)

Change `title`, `meta description`, `og:title`/`og:description` and `twitter:*` mirrors. Titles ≤ 60 chars,
descriptions ≤ 155, no em dashes. Copy below is the target; implementers may adjust wording only to keep claims true
to the page (verify every fact against the page/pricing component).

| Page | Title | Description |
|---|---|---|
| `/` | Open-Source EVM Block Explorer, Live in 5 Minutes \| Ethernal | Run a block explorer for any EVM chain from an RPC URL. Hosted for you or self-hosted under MIT. Verified contracts, tracing, tokens. Free plan. |
| `/launch-block-explorer` | Block Explorer Hosting: Launch a Custom EVM Explorer | Hosted block explorer for your EVM chain or rollup. Paste an RPC URL, get a branded explorer with verification and APIs. Free to start. |
| `/etherscan-alternative` | Etherscan Alternatives for Your Own Chain (2026) | Etherscan doesn't offer self-serve explorers for new chains. Compare Ethernal, Blockscout, Routescan and building in-house on price, setup and features. |
| `/blockscout-alternative` | Blockscout Alternative: Hosted EVM Explorer, No DevOps | Self-hosting Blockscout means running Postgres, an indexer and a UI. Compare setup, pricing and features with Ethernal, and see when Blockscout wins. |
| `/pricing` | Block Explorer Pricing: Free, $150 and $500 Plans \| Ethernal | Starter is free. Team is $150/mo with a custom domain. App Chain is $500/mo with full whitelabel. Compare limits and features of every plan. |

De-cannibalization: the homepage keeps "open-source EVM block explorer" intent; the homepage hero/feature copy gets one
contextual link with anchor text "block explorer hosting" to `/launch-block-explorer`.

`/etherscan-alternative` body: if it does not already list alternatives, add an "Etherscan alternatives at a glance"
table near the top (Ethernal, Blockscout, Routescan, building in-house; columns: hosted option, self-host, setup
time, starting price, best for), linking to the existing comparison pages. Be honest about competitor strengths
(existing comparison-page rule). Facts must come from the existing comparison pages; no new competitor claims.

Pricing facts must match `CLAUDE.md` § Pricing and the landing pricing component; if they disagree, stop and report.

### C. Signup attribution (app PostHog)

1. `Dockerfile.caddyfile` app-build stage: `ARG`/`ENV` `VITE_POSTHOG_API_KEY`, `VITE_POSTHOG_API_HOST`,
   `VITE_POSTHOG_ALLOWED_HOSTS`.
2. `.github/workflows/test_and_deploy.yml` `deploy_caddy`: pass them as build args, as literals (the project key is a
   public write-only key, already committed in `landing/src/main.js` and the blog layout):
   `VITE_POSTHOG_API_KEY=phc_W1H8OCkSPHM7iP8fxwINcnV5CkVpLj6i6yzwQfsCAtC`, `VITE_POSTHOG_API_HOST=/ingest`,
   `VITE_POSTHOG_ALLOWED_HOSTS=app.tryethernal.com`.
3. `src/plugins/posthog.js`: initialise only when key + host are set **and** `window.location.hostname` is in the
   comma-separated `VITE_POSTHOG_ALLOWED_HOSTS` (if that variable is unset, behave as today: key + host suffice).
   The same SPA renders every public explorer subdomain and custom domain; those must never send events. Add
   `ui_host: 'https://us.posthog.com'`. Keep `person_profiles: 'identified_only'`, autocapture, pageview, pageleave,
   `ip: true`. Do not set a custom cookie domain: posthog-js's default cross-subdomain cookie on `.tryethernal.com` is
   what joins the landing/blog anonymous id to the app session, and the existing `identify(String(user.id))` in
   `src/stores/user.js` then merges it with the backend's `auth:user_signup` person (distinct id = user id).
   Stub object when disabled stays as today (`capture`/`reset`/`identify` no-ops).
4. Self-hosted builds (`Dockerfile.frontend`, docker-compose) are unchanged and stay analytics-free.
5. Update `.claude/references/MARKETING.md` § PostHog with the build-arg requirement and the host allowlist.

### D. Setup guides (landing)

A `/guides` hub plus four guides, as Vue SFC pages following the existing landing patterns (layout, components,
`useHead`, JSON-LD). Each guide: answer-first intro (≤ 60 words), "What you need" list, numbered steps,
troubleshooting/FAQ (3–5 questions), CTA links tagged `utm_source=landing&utm_medium=guide&utm_campaign=<slug>`,
related links, canonical, og tags, BreadcrumbList + HowTo + FAQPage JSON-LD. No em dashes.

| Route | H1 / target queries |
|---|---|
| `/guides` | Block Explorer Guides |
| `/guides/create-block-explorer` | How to Create a Block Explorer for an EVM Chain. "create a block explorer", "how to build a block explorer", "create block explorer". Covers the three paths (build in-house → `/build-vs-buy-block-explorer`, self-host open source → self-host guide, hosted → steps). |
| `/guides/self-host-block-explorer` | How to Self-Host a Block Explorer with Docker. "host your own block explorer", "self hosted block explorer". From `README.md` self-host section and `docker-compose.prod.yml`; state the beta status plainly. |
| `/guides/op-stack-block-explorer` | How to Set Up a Block Explorer for an OP Stack Chain. Links to `/op-stack`. |
| `/guides/arbitrum-orbit-block-explorer` | How to Set Up a Block Explorer for an Arbitrum Orbit Chain. Links to `/arbitrum-orbit`. |

**Accuracy rule:** every step, field name, requirement and limit must be traceable to the code (onboarding wizard,
OP/Orbit config models/forms/API, README, compose file) or an existing landing page. Do not invent features,
screenshots, numbers or timings. If a step can't be confirmed from code, leave it out and list it in the report.

Linking: footer "Guides" link in `LandingFooter.vue` and mirrored in `blog/src/components/Footer.astro`; contextual
links from `/op-stack`, `/arbitrum-orbit`, `/launch-block-explorer` (create guide) and `/etherscan-alternative` or
`/build-vs-buy-block-explorer` (self-host guide); `landing/public/llms.txt` gets a `## Guides` section. Sitemap is
generated from routes automatically.

## Out of scope (flagged)

- `@vueuse/head` is unmaintained (last release 2024, superseded by `@unhead/vue`); migrating is a separate change.
- Search-volume-based new pages beyond the four guides; unit-converter per-pair pages.
- Sitemap `lastmod` (only useful if accurate per page).

## Libraries considered

| Need | Chosen | Considered / why not |
|---|---|---|
| 404 status for static sites | Caddy `handle_errors` + `file_server` (built in) | Express/SSR fallback: no server in this path. |
| www redirect, route matchers | Caddy built-ins | none needed |
| Page meta | `@vueuse/head` (already used on every page) | `@unhead/vue` 3.4.3 (6.5M/wk, MIT) is the maintained successor; switching all pages is out of scope (flagged). |
| Analytics identity across subdomains | `posthog-js` built-in cross-subdomain cookie + `identify` (already in app) | Server-side alias via backend `analytics.alias`: unnecessary once the frontend is initialised. Segment/RudderStack: new vendor for no gain. |
| Guide pages | Vue SFC pages in the existing landing pattern | `unplugin-vue-markdown` 32.1.1 (335k/wk, MIT): Markdown authoring is nicer, but four pages need per-page JSON-LD, CTAs and shared components the SFC pattern already provides; a new build plugin for four pages isn't worth it. |

## Verification

- Landing build + blog build + app build (Freestyle VM). Landing/app unit tests (`vitest`) incl. new tests for the
  PostHog host gate (allowed host → init with expected options; other host → stub; no key → stub).
- Caddy: `caddy validate` on the new Caddyfile, then run Caddy in Docker on the VM against the built landing/blog
  `dist` dirs (apex reached via `Host:` headers / `--resolve`) and assert: known pages 200, unknown apex paths 404 with
  the 404 page body, `/blog/<missing>` 404, `www` 301 to apex, `/app-chains` served by landing (not the websocket
  upstream), `/app/<key>` still routed to the websocket upstream, explorer-subdomain unknown path still 200 SPA.
- After release: PostHog shows events with `$host = app.tryethernal.com` and `$identify`; GSC re-inspection of the
  19 unknown URLs. A routine checks indexing, CTR and attribution ~6 weeks after release.

## Deploy

Landing, blog, app and Caddyfile ship only with a release tag (`deploy_caddy` runs on `v*` tags). Note: #1409 (blog
noindex) is also not live until the next release.
