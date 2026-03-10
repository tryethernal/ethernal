# Landing Site & Brand Kit

## Landing Site (`landing/`)

Standalone Vue 3 + Vuetify 3 marketing site, separate from the main app frontend.

### Structure

| Directory | Purpose |
|-----------|---------|
| `src/components/` | Reusable landing components (Navbar, Footer, Hero, Features, Pricing, etc.) |
| `src/pages/` | Route-level pages (HomePage, PricingPage, ContactPage, integration pages) |
| `src/styles/landing.scss` | Global styles, `.landing-section` spacing, button classes |
| `src/composables/` | Vue composables (useScrollReveal) |
| `brand-kit/` | Brand specification (JSON + visual audit HTML) |

### Key Patterns

- **FeatureSection.vue**: Reusable component with `#visual` slot for browser preview mockups, supports `inline-icon`, `compact`, `:reverse` props
- **Browser preview mockup**: macOS-style window chrome (`.preview-header`, `.dot.red/.yellow/.green`, `.preview-url-bar`, `.preview-body`)
- **Page structure**: `LandingLayout` wrapper → `page-title-bar` header → content sections → `LandingCTA`
- **API calls**: Use `import.meta.env.VITE_APP_URL` (defaults to `https://app.ethernal.com`, override via `VITE_APP_URL` env var or `.env.development`)
- **Mega menu navbar**: 3-column dropdown (Development Tools, Infrastructure, L2 Rollups) with icons and descriptions
- **Docker dev**: Port 8174. Set `VITE_APP_URL` in `.env.development` to point to the local backend (port 8888).

## Brand Kit

### Key Files

| File | Purpose |
|------|---------|
| `landing/brand-kit/brand-kit.json` | Machine-readable brand spec (colors, typography, components, voice rules) |
| `landing/brand-kit/index.html` | Visual audit page — open in browser to review all brand elements |
| `.agents/product-marketing-context.md` | Product positioning, personas, competitive landscape, messaging |

### Brand Rules

**Logo:** Text-only wordmark "Ethernal" in Exo 600. NO icon/symbol/SVG exists — never fabricate one.

**Colors:**
- Primary: `#3D95CE`, Light: `#5DAAE0`, Dark: `#29648E`
- Gradient: `linear-gradient(90deg, #3D95CE, #5DAAE0)` — for CTAs and accent text
- Dark backgrounds: `#0B1120` (base), `#111827` (card), `#151D2E` (surface)
- Text: `#F1F5F9` (primary), `#94A3B8` (secondary), `#64748B` (muted)
- Borders: `rgba(61, 149, 206, 0.22)` (subtle), `rgba(61, 149, 206, 0.4)` (glow)

**Typography:**
- Headings: Exo (600-700), letter-spacing -0.02em
- Body: Roboto (400-500), line-height 1.7
- Code: JetBrains Mono

**Voice:** Direct, confident, developer-friendly. Short sentences. Lead with benefit. No hype words (revolutionary, game-changing). Use concrete numbers. Show code over marketing speak. Only emoji is 🍷 in footer. Never use em dashes (—) or double hyphens (--) in copy; rewrite sentences to avoid them.

**Tagline:** "Etherscan for your blockchain"

**Trust badges:** No credit card required · 7-day free trial · MIT licensed

**Social proof:** Consensys, Rakuten, Zilliqa, Primex, Entangle, Smart Trade

**Key URLs:**
- App: `https://app.ethernal.com`
- Docs: `https://doc.tryethernal.com`
- GitHub: `https://github.com/tryethernal/ethernal`
- Discord: `https://discord.gg/jYCER6Mh`
- Blog: `https://blog.tryethernal.com`
