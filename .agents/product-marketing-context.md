# Product Marketing Context

*Last updated: 2026-03-04*

## Product Overview
**One-liner:** Etherscan for your blockchain.
**What it does:** Ethernal is an open-source block explorer for EVM-based chains. You paste an RPC URL, and in 5 minutes you have a fully-featured, branded block explorer with transaction tracing, contract verification, analytics, and real-time updates. It can be self-hosted with Docker or used as a managed cloud service.
**Product category:** Block explorer / Blockchain infrastructure tooling
**Product type:** Open-source SaaS (freemium with self-hosted option)
**Business model:** Freemium. Free tier for testing. Paid plans at $20/mo (private dev), $150/mo (public starter), $500/mo (growth), custom (enterprise). 7-day free trial on paid plans. MIT-licensed self-hosted option.

## Target Audience
**Target companies:** Web3 startups, L2/L3 chain operators (Arbitrum Orbit, OP Stack), DeFi protocols, enterprise blockchain teams, solo developers building on EVM chains.
**Decision-makers:** CTOs, lead engineers, DevOps, blockchain infrastructure leads, developer relations.
**Primary use case:** Deploy a production-ready block explorer for a custom EVM chain without building one from scratch.
**Jobs to be done:**
- "I need a block explorer for my chain so my community can verify transactions"
- "I need to debug smart contract transactions during development"
- "I need a branded explorer that looks like part of my product"
**Use cases:**
- Developers: Debug transactions with call traces on Hardhat/Anvil/Ganache
- Teams: Shared visibility into chain activity with custom domains
- App Chains: Production explorer with branding, analytics, L2 bridge support

## Personas
| Persona | Cares about | Challenge | Value we promise |
|---------|-------------|-----------|------------------|
| Solo Developer | Fast setup, free tier, debugging | Needs visibility into local chain without building custom tools | Full explorer for Hardhat/Anvil in seconds, free forever |
| CTO / Tech Lead | Production readiness, custom branding, reliability | Needs to ship a branded explorer without diverting eng resources | 5-minute setup, custom domain/branding, zero maintenance |
| DevOps / Infra | Self-hosting, control, Docker support | Wants to run explorer on own infrastructure with full data control | MIT-licensed, Docker Compose, `make start` and done |
| Chain Operator | L2 bridge monitoring, analytics, scalability | Managing visibility across L1/L2 with deposits, withdrawals, batches | Native Orbit/OP Stack bridge support, real-time analytics |

## Problems & Pain Points
**Core problem:** Building or running a block explorer for a custom EVM chain is painful — existing options take days/weeks to set up, require heavy infrastructure, or lack customization.
**Why alternatives fall short:**
- Blockscout: Complex setup, heavy infrastructure requirements, slow indexing, limited branding
- Rolling your own: Months of engineering effort, ongoing maintenance burden
- Etherscan-as-a-service: Expensive, not self-hostable, limited customization, vendor lock-in
**What it costs them:** Weeks of engineering time, infrastructure complexity, delayed chain launches, poor developer/community experience.
**Emotional tension:** Frustration at how hard it is to get a basic explorer running. Anxiety about launching a chain without a working explorer for the community.

## Competitive Landscape
**Direct:** Blockscout — open source but complex to deploy, heavy infra requirements, slower to customize
**Direct:** Routescan — managed service but expensive and less customizable
**Secondary:** Building a custom explorer in-house — full control but massive time investment
**Indirect:** Using Etherscan directly — only works for supported chains, no customization, no self-hosting

## Differentiation
**Key differentiators:**
- 5-minute setup (paste RPC URL and done)
- Full branding control (logo, colors, domain, theme)
- Self-hostable with Docker (MIT license, `make start`)
- Native L2 bridge support (Arbitrum Orbit + OP Stack)
- Built-in transaction tracing with full call trees
- Works with any EVM chain, including local dev chains (Hardhat, Anvil, Ganache)
**How we do it differently:** Zero-config approach — no indexer setup, no database configuration, no node modifications. Just an RPC URL.
**Why that's better:** Teams ship faster, spend zero eng resources on explorer infrastructure, and get a branded product immediately.
**Why customers choose us:** Speed of setup, open source with no vendor lock-in, and branding that makes it look like a first-party product.

## Objections
| Objection | Response |
|-----------|----------|
| "Blockscout is free and more established" | Blockscout takes days to set up and requires significant infra. Ethernal is live in 5 minutes. Both are open source. |
| "We'll build our own eventually" | Most teams never do — it's months of work. Start with Ethernal now and revisit later. MIT license means no lock-in. |
| "$150/mo is expensive" | Compare to the eng hours of building/maintaining an explorer. One day of eng time costs more than a year of Ethernal. |

**Anti-persona:** Teams with existing dedicated explorer infrastructure teams. Chains that need non-EVM support. Users who need archive node data without providing an archive RPC.

## Switching Dynamics
**Push:** Current explorer setup is too complex. Takes too long. Doesn't support custom branding. Infrastructure is a pain.
**Pull:** 5-minute setup. Custom domain/branding. Self-hostable. Works with any EVM chain. MIT licensed.
**Habit:** "We've always used Blockscout" or "We have a custom setup that kinda works."
**Anxiety:** "Will it handle our transaction volume? Is the team behind it reliable? Will the open-source version get abandoned?"

## Customer Language
**How they describe the problem:**
- "We need a block explorer for our chain"
- "Setting up Blockscout was a nightmare"
- "We don't have time to build our own explorer"
- "Our community needs to be able to verify transactions"
**How they describe us:**
- "Ethernal is exactly what we needed for our L2"
- "Set up took 10 minutes"
- "The self-hosted option was the deciding factor"
- "Transaction tracing saved our team hours of debugging"
**Words to use:** block explorer, EVM, self-hosted, open source, branded, custom domain, deploy, 5 minutes, RPC URL, MIT licensed, transaction tracing
**Words to avoid:** Web3 buzzwords without substance ("revolutionary", "game-changing"), "blockchain" as a generic hype term, overpromising on decentralization
**Glossary:**
| Term | Meaning |
|------|---------|
| Block explorer | Web interface for browsing blockchain data (blocks, transactions, addresses) |
| EVM | Ethereum Virtual Machine — the standard for most blockchain smart contracts |
| RPC URL | The API endpoint of a blockchain node |
| L2 / L3 | Layer 2/3 scaling chains (Arbitrum Orbit, OP Stack) |
| Transaction tracing | Debugging tool showing full call tree of a transaction |
| Contract verification | Uploading source code so contract functions are human-readable |

## Brand Voice
**Tone:** Direct, confident, developer-friendly. No hype, no jargon for its own sake.
**Style:** Short sentences. Lead with the benefit. Show, don't tell. Code examples over marketing speak. Slight wit (🍷 Made with care in France).
**Personality:** Technical but approachable. Honest (open source, transparent pricing). Practical (5 minutes, just paste your RPC). Quietly confident (not trying to impress, just delivering).

## Proof Points
**Metrics:** 5-minute setup time. 10K+ blocks on free tier. MIT licensed.
**Customers:** Consensys, Rakuten, Zilliqa, Primex, Entangle, Smart Trade
**Testimonials:**
> "Ethernal is exactly what we needed for our L2. Set up took 10 minutes and our community had a fully branded explorer the same day." — Alex Chen, CTO, DeFi Protocol
> "We replaced our custom-built explorer with Ethernal. The transaction tracing alone saved our team hours of debugging every week." — Sarah Kim, Lead Engineer, Web3 Startup
> "The self-hosted option was the deciding factor. We run it on our own infra with Docker and have full control over our data." — James Park, DevOps, Enterprise Chain
**Value themes:**
| Theme | Proof |
|-------|-------|
| Speed | 5-minute setup, just an RPC URL |
| Open Source | MIT license, full repo on GitHub, `make start` |
| Branding | Custom domain, logo, colors, theme |
| Developer Experience | Transaction tracing, contract verification, Hardhat/Anvil integration |
| Production Ready | Used by Consensys, Rakuten, Zilliqa |

## Goals
**Business goal:** Grow paid public explorer subscriptions (Starter + Growth tiers).
**Conversion action:** Sign up and connect an RPC URL (free trial).
**Current metrics:** —
