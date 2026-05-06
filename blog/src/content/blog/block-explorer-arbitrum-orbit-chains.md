---
title: "Block Explorer for Your Arbitrum Orbit Chain: Arbiscan, Blockscout, Ethernal, and Routescan Compared"
description: "Arbiscan, Blockscout, Ethernal, and Routescan compared for Arbitrum Orbit chains. Bridge UI, AnyTrust support, setup time, pricing, and a decision framework."
date: 2026-05-06
tags:
  - Infrastructure
  - L2
  - Comparison
image: "/blog/images/block-explorer-arbitrum-orbit-chains.png"
ogImage: "/blog/images/block-explorer-arbitrum-orbit-chains-og.png"
status: published
readingTime: 13
---

*Last updated: May 2026*

Your Orbit chain is live. Contracts are deployed, the sequencer is running, and you tell your community to "check the explorer." They Google your chain name. Nothing comes up. So they try Arbiscan. It shows Arbitrum One. Not your chain.

This is not a rare edge case. It happens to most teams that launch an Orbit chain without explicitly choosing an explorer. Arbiscan covers exactly two chains: Arbitrum One (`arbiscan.io`) and Arbitrum Nova (`nova.arbiscan.io`). It is a per-chain, licensed deployment operated by the Etherscan team under a specific arrangement with Offchain Labs. It does not index custom Orbit deployments. It cannot be self-hosted. There is no process to request coverage for your chain.<sup>[1](#fn-1)</sup>

The practical consequence: every team launching an Orbit chain needs to make an active explorer decision before going public. The options are Blockscout, Ethernal, and Routescan, each with different trade-offs specific to Orbit. Arbiscan still belongs in the picture, but only as a parent-chain reference tool, not as your chain's explorer.

This article covers what Orbit chains specifically need from an explorer (it is more than generic EVM indexing), then runs each option through that lens with a comparison table, decision framework, and a setup walkthrough.

> **Takeaways**
>
> - Arbiscan does not cover custom Orbit deployments. Pick one of three real options: Blockscout, Ethernal, or Routescan.
> - Blockscout ships in the Orbit quickstart; it is the default for DevNets, but production self-hosting requires Elixir/Erlang operations experience.
> - Ethernal has native bridge and batch monitoring for Orbit built in. MIT license. Under 5 minutes from RPC URL to working explorer.
> - Routescan has a dedicated Orbit portal (`orbit.routescan.io`) and a unified multichain API, best if you are building analytics or need cross-chain data.
> - AnyTrust chains (like Nova-type deployments) have DAC certificate transactions that Rollup chains do not. Explorer support for this varies and is worth verifying before launch.

---

## What Orbit chains actually need from an explorer

A generic EVM explorer shows blocks, transactions, and addresses. An Orbit-aware explorer shows whether your chain is healthy. These are different products.

Orbit introduces primitives that standard EVM explorers were not designed to display. If your explorer does not understand them, your users see incomplete data and your operators fly blind.

Retryable tickets are Arbitrum's canonical mechanism for L1-to-L2 (parent-to-child) cross-chain messages.<sup>[2](#fn-2)</sup> When a user deposits funds or a contract sends a cross-chain call, it creates a retryable ticket with a 1-week validity window that can be auto-redeemed by the sequencer or manually redeemed by anyone. The ticket moves through states: pending, redeemed, or expired. A generic explorer shows the submission transaction. An Orbit-aware explorer shows the full ticket lifecycle: which state it is in, whether the auto-redeem succeeded, and the hash of the redemption transaction if it exists.

Batch posting is how your sequencer publishes finalized transaction data to the parent chain. The batch poster account must stay funded. There is no automatic refill mechanism.<sup>[3](#fn-3)</sup> If the batch poster runs out of funds, batches stop. Your chain keeps running locally but stops finalizing. An explorer that shows batch submission activity lets you monitor this operationally, not just react after the fact.

Bridge deposit and withdrawal state maps directly to user support tickets. L1 deposits create retryable tickets (see above). L2-to-L1 withdrawals go through a 7-day challenge window before they can be claimed on the parent chain. Users who cannot see the status of their pending withdrawal will open support tickets. An explorer that shows the withdrawal state machine (initiated, challenge period active, ready to claim, claimed) is not a nice-to-have feature.

AnyTrust chains (the Nova-type deployments) add another layer. In AnyTrust mode, the sequencer posts data to a permissioned Data Availability Committee (DAC) rather than to L1 directly. The DAC issues a Data Availability Certificate, and the certificate (not the full data) is posted to L1.<sup>[4](#fn-4)</sup> Arbitrum Nova runs a 7-party DAC; 6 of 7 honest members are required for the normal AnyTrust path. If the DAC cannot reach agreement, the chain falls back to full rollup mode and posts the data directly. An explorer should ideally show which mode a given batch used. This is an under-documented requirement, and explorer support varies.

Assertions and the validator set are how Orbit chains advance their confirmed state on the parent chain. Validators post assertions (rolled-up state claims) at regular intervals. If assertions stop (due to validator failure or insufficient funds), the chain is at risk of entering a dispute-less state. Explorer visibility into assertion activity is part of the operational monitoring picture.<sup>[5](#fn-5)</sup>

These requirements define the evaluation criteria below.

---

## Evaluation criteria

| Criterion | Why it matters for Orbit |
|---|---|
| Supports custom Orbit chains | Basic requirement; Arbiscan fails this |
| Bridge / retryable ticket UI | Direct user support reduction |
| Batch monitoring | Operational health visibility |
| AnyTrust / DAC display | Required for Nova-type chains |
| Open source | Extensibility, copyleft constraints |
| Self-hostable | Data sovereignty, offline chains |
| White-label | Brand identity for app chains |
| Setup time | Speed to production |
| Starting price | Budget planning |

---

## Arbiscan: for Arbitrum One and Nova, not your chain

**Arbiscan covers two chains. Your chain is not one of them.**

Arbiscan (`arbiscan.io`) and Nova Arbiscan (`nova.arbiscan.io`) are operated by the Etherscan team under a licensing agreement with Offchain Labs. They index Arbitrum One and Arbitrum Nova (two specific chains) and nothing else. There is no EaaS offering for custom Orbit deployments. You cannot deploy Arbiscan for your own chain.<sup>[1](#fn-1)</sup>

Where Arbiscan *is* useful: as a parent-chain reference tool. If your Orbit chain settles on Arbitrum One, your users can look up the corresponding parent-chain transactions on Arbiscan. Batch submissions, cross-chain message receipts, and withdrawal claims on the Arbitrum One side will appear there. That is a legitimate use case, and Arbiscan is excellent at it.

But it is not a choice for your chain's own explorer. The decision is between the three options below.

---

## Blockscout: the default that ships with Orbit

**Blockscout is what you get when you run the Orbit quickstart. It is a solid start and a non-trivial production deployment.**

The official Arbitrum Orbit setup script (`orbit-setup-script`) bundles a Blockscout instance via Docker Compose.<sup>[6](#fn-6)</sup> Run `docker-compose up` in the quickstart and Blockscout starts indexing your chain. For DevNets and early testing, this means zero additional configuration; your explorer comes included.

Blockscout is open-source under GPLv3 and supports over 1,000 networks including Ethereum, Optimism, Arbitrum, Base, and Gnosis.<sup>[7](#fn-7)</sup> It has Arbitrum-specific tabs on its Arbitrum One (`arbitrum.blockscout.com`) and Nova (`arbitrum-nova.blockscout.com`) instances, including batch submission data and L1 confirmation status. For custom Orbit chains deployed via self-hosting, the Nitro-compatible indexer picks up standard EVM transactions immediately.

Orbit-specific features in self-hosted Blockscout: the indexer understands Arbitrum Nitro's transaction format. Arbitrum-specific data (batch info, L1 confirmation status, cross-chain message tracking) depends on configuration and is better developed in Blockscout's hosted Arbitrum instances than in a bare self-hosted deployment. Teams that need full bridge UI from day one will need to configure it.

Autoscout is Blockscout's managed hosting service. One-click deployment, auto-indexing, autoscaling, and compatibility with Arbitrum Nitro (Orbit) out of the box.<sup>[8](#fn-8)</sup> It removes the Elixir operations burden at the cost of a hosted subscription.

The self-hosting reality: Blockscout's Elixir/Erlang runtime is not like running a Node.js or Go service. Production deployments require someone who knows Elixir operations: supervision trees, BEAM VM tuning, database connection pooling, and indexer configuration. Teams without this background regularly underestimate the time involved in going from the quickstart to a production-stable deployment.

The GPLv3 consideration: Blockscout is copyleft. If you modify and distribute the code, your modifications must also be GPLv3. For teams that want to add Orbit-specific UI (a custom retryable dashboard, a DAC status display), GPLv3 determines what they can do with those modifications. MIT is more permissive.

Best for: teams that started with the Orbit quickstart and want to stay on a familiar stack, have Elixir operations capacity for production, or prefer the managed Autoscout path.

---

## Ethernal: native Orbit bridge support and white-label

**Ethernal has Orbit-specific bridge and batch monitoring built in. MIT license. Under 5 minutes from RPC URL to working explorer.**

We built [Ethernal](https://tryethernal.com) to solve the "I need an explorer for my chain right now" problem. We power 2,600+ public explorers across 370+ unique EVM chains, with 13,000+ users.<sup>[9](#fn-9)</sup>

For Orbit chains specifically, Ethernal includes native L2 bridge support: deposit tracking, withdrawal claim status, and batch monitoring. These are not add-ons that require configuration; they are part of the product for Orbit deployments. Users can see the state of a pending L1 deposit without filing a support ticket. Operators can see when the last batch was posted and whether the batch poster is active.

Transaction tracing with decoded internal calls, state diffs, and balance changes is included at all tiers. For debugging retryable ticket execution failures (where the submission transaction succeeded but the redemption failed), full call traces show exactly where execution reverted inside the retried call.

Deployment options:

- Managed hosting at tryethernal.com: paste your RPC URL, your explorer starts indexing within minutes. No infrastructure to manage.
- Self-hosted: `git clone https://github.com/tryethernal/ethernal && make start`. The setup script generates all environment files and starts all services. No Elixir, no custom runtime.

MIT license means teams can fork and extend without copyleft constraints. If you need a custom DAC certificate status display or a bespoke retryable dashboard, you can build it and keep it proprietary or open-source it on your own terms.

Pricing for Orbit teams:

- $0 Starter: ad-supported, Ethernal branding, contract verification, transaction tracing, and basic explorer features.
- $150/mo Team: L2 bridge support included. Custom domain, no ads, 100k transactions included.
- $500/mo App Chain: full white-label. Custom domain, logo, colors, status page, total supply display, 5M transactions included. For app chains that need their own brand.
- Enterprise: custom pricing for high transaction volume or custom requirements.

Limitations: EVM-only. No support for non-EVM chains. The self-hosted version is in beta; see the [GitHub repository](https://github.com/tryethernal/ethernal) for current status. Smaller ecosystem than Blockscout by several years of head start.

Best for: Orbit app chains that need white-label branding and built-in bridge/batch UI, teams that want the fastest path from RPC URL to production explorer, and teams that want MIT-licensed code they can fork for custom Orbit features.

---

## Routescan: multi-chain API with Orbit coverage

**Routescan has a dedicated Arbitrum Orbit explorer portal and a unified multi-chain API. Best for teams building analytics tools or managing multiple chains.**

Routescan (`orbit.routescan.io`) provides a dedicated portal for Arbitrum Orbit chains with documentation at `orbit.routescan.io/documentation`.<sup>[10](#fn-10)</sup> As of Q1 2025, Routescan holds 12.8% of the L3 explorer market, with strong coverage of L3 testnets specifically.<sup>[11](#fn-11)</sup> Across all chains, Routescan indexes 160+ blockchains.

The differentiating feature is the multi-chain API: one API key for all indexed chains, with an Etherscan-compatible format. For teams building wallets, bridges, or analytics dashboards that need to query data across multiple chains (including their Orbit L3 and the Arbitrum One or Ethereum L1 it settles on), a single API key that works everywhere is a meaningful workflow advantage.

How Orbit deployment works: Routescan is a closed-source EaaS. You contact their team to get your Orbit chain indexed and hosted. The process is not self-serve; it is a "contact us" model. Timelines and specifics are negotiated with the Routescan team.

Limitations: not open-source, so you cannot audit or self-host the code. Customization and branding are more limited than what you get with an open-source self-hosted deployment. The contact-sales model means you cannot spin up an explorer for a DevNet in 5 minutes on your own.

Best for: teams building multi-chain analytics tools, wallets, or dashboards that need cross-chain API access. Teams that are already using Routescan across multiple chains and want consistent tooling. Teams where the managed service model is preferred over operating infrastructure.

---

## Comparison table

| Criterion | Arbiscan | Blockscout | Ethernal | Routescan |
|---|---|---|---|---|
| **Supports custom Orbit chains** | No | Yes | Yes | Yes (EaaS) |
| **Open source** | No | GPLv3 | MIT | No |
| **Self-hostable** | No | Yes (complex) | Yes (Docker) | No |
| **Ships with Orbit quickstart** | N/A | Yes | No | No |
| **Native bridge / retryable UI** | N/A | Partial (config-dependent) | Yes | Partial |
| **Batch monitoring** | N/A | Via configuration | Yes | Unknown |
| **AnyTrust / DAC display** | N/A | Not confirmed | Forkable (MIT) | Not confirmed |
| **Transaction tracing** | Basic (Arb One) | Full traces | Full traces | Basic |
| **White-label** | No | Full (self-hosted) | $500/mo | Moderate |
| **Setup time** | N/A | Quickstart: instant / Production: days | Under 5 min | Contact sales |
| **Starting price** | N/A | Free (self-hosted) | $0 managed / $150/mo (bridge support) | Paid EaaS |
| **Multi-chain API** | No | No | No | Yes |

*Partial or unknown entries reflect under-documented behavior that varies by deployment configuration. Verify directly with the provider for your specific chain type before launch.*

---

## Decision framework

| Use Case | Recommended | Why |
|---|---|---|
| Orbit DevNet, need explorer today | Ethernal (free managed) or Blockscout (already in quickstart) | Ethernal: paste RPC, done. Blockscout: already running from setup script. |
| Production Orbit chain, white-label branding | Ethernal App Chain ($500/mo) or Blockscout self-hosted | Ethernal: lowest published price for full white-label. Blockscout: deepest customization if you have Elixir capacity. |
| AnyTrust / Nova-type chain | Ethernal (MIT, fork for DAC display) or Blockscout (reference Nova instance) | MIT license lets you build custom DAC UI without copyleft. Blockscout has production Nova instance to reference. |
| Multi-chain analytics or wallet | Routescan | Unified API across all indexed chains, Etherscan-compatible format. |
| Parent-chain transaction lookup | Arbiscan | For Arb One/Nova side transactions only, not your chain. |
| Data sovereignty / air-gapped chain | Ethernal (self-hosted) or Blockscout (self-hosted) | MIT vs GPLv3. Ethernal is simpler to run in production without Elixir expertise. |

One common pattern: teams use Ethernal or Blockscout as the public-facing explorer for their chain while pointing operators to Arbiscan for parent-chain transaction lookups. These roles do not conflict.

---

## Try it: deploy Ethernal for your Orbit chain

Most comparison articles stop at the table. This is the actual process.

**Managed (fastest path):**

1. Go to [tryethernal.com](https://tryethernal.com) and create an account.
2. Click "Add Explorer," enter your chain's RPC URL and chain ID.
3. The explorer starts indexing. Share the URL with your team.

Under 5 minutes. No infrastructure to manage. L2 bridge support is available on the Team plan ($150/mo).

**Self-hosted:**

```bash
git clone https://github.com/tryethernal/ethernal.git
cd ethernal
git checkout $(git describe --tags --abbrev=0)
make start
```

`make start` prompts for your domain or IP, generates all environment files, and starts all services: PostgreSQL, Redis, backend, frontend, and sync workers. When it finishes:

```
==================== Ethernal Installation Complete! ====================
  Start here to setup your instance:
    http://your-domain-or-ip/setup
=======================================================================
```

Visit the setup URL, enter your Orbit chain's RPC URL, and the explorer begins indexing. DNS and SSL for a custom domain are handled automatically.

For Orbit-specific features on the self-hosted version, the MIT license means you can fork the repository and add custom UI for DAC certificate status, retryable ticket dashboards, or assertion monitoring, without any copyleft obligations on your additions.

---

## Frequently asked questions

### Which block explorer works with Arbitrum Orbit chains?

Blockscout, Ethernal, and Routescan all support custom Arbitrum Orbit chain deployments. Arbiscan does not. It only covers Arbitrum One and Arbitrum Nova. For teams launching a custom Orbit L2 or L3, the choice is between Blockscout (bundled in the Orbit quickstart, GPLv3), Ethernal (MIT, native bridge UI, 5-minute setup), and Routescan (managed EaaS with a dedicated Orbit portal at orbit.routescan.io).

### Can I use Arbiscan for my Orbit chain?

No. Arbiscan is a per-chain deployment operated by the Etherscan team specifically for Arbitrum One and Arbitrum Nova. It cannot be self-hosted, and there is no process for requesting coverage for a custom Orbit chain. Arbiscan is useful for looking up parent-chain transactions on Arbitrum One or Nova, but it will not index your chain.

### What is the fastest way to get an explorer for an Orbit chain?

Ethernal's managed hosting is the fastest path: paste your RPC URL and your explorer starts indexing in minutes with no infrastructure setup. Blockscout is the next fastest if you are already running the Orbit quickstart setup script, which bundles Blockscout via Docker Compose. Routescan requires a contact-sales process and is not self-serve.

### Does any explorer support AnyTrust DAC certificate display?

AnyTrust-specific display (showing whether a batch used a DA certificate vs. full rollup fallback) is an under-documented feature across all explorers. No provider clearly confirms this feature for custom Orbit deployments. Blockscout has production instances for Arbitrum Nova (an AnyTrust chain) that can serve as a reference. Ethernal's MIT license allows teams to fork and implement custom DAC display without copyleft constraints. Verify current status directly with each provider before choosing based on this requirement.

### What is the cheapest way to run a block explorer for an Orbit chain?

Self-hosting Blockscout or Ethernal on your own infrastructure has no per-month SaaS cost. Ethernal requires only Docker and a server; Blockscout requires Elixir/Erlang operations experience in addition to Docker. Ethernal's managed hosting starts at $0 (Starter plan, ad-supported). L2 bridge support in Ethernal's managed hosting starts at $150/mo on the Team plan. Routescan and Blockscout Autoscout are paid EaaS with pricing available on request.

### How does Blockscout bridge support compare to Ethernal for Orbit chains?

Blockscout has Arbitrum-specific tabs on its hosted Arbitrum One and Nova instances (batch data, L1 confirmation status, cross-chain message tracking). For custom Orbit chains deployed via self-hosting, bridge UI is configuration-dependent and better documented on the hosted instances than in bare self-hosted deployments. Ethernal includes native bridge support (deposit tracking, withdrawal claim status, batch monitoring) for Orbit chains as part of the product, with no additional configuration required on the Team plan.

---

## Takeaways

- Arbiscan is not an option for custom Orbit chains. The real decision is between Blockscout, Ethernal, and Routescan.
- Blockscout ships with the Orbit quickstart, making it the zero-friction choice for DevNets. Production self-hosting requires Elixir operations experience.
- Ethernal has native Orbit bridge and batch monitoring built in. MIT license allows forking for custom Orbit UI. Under 5 minutes from RPC URL to working explorer.
- Routescan's dedicated Orbit portal and unified multi-chain API make it the best fit for analytics tools and teams managing multiple chains.
- AnyTrust chains have specific display requirements (DAC certificate status) that no provider fully documents for custom deployments. Verify before launch.
- The batch poster account must stay funded manually. An explorer that shows batch submission activity is part of operational monitoring, not just user-facing UX.
- Self-hosting Ethernal (MIT) or Blockscout (GPLv3) gives full data sovereignty. Ethernal's Docker setup is simpler to run without Elixir expertise.

---

If your Orbit chain is live or launching soon, [try Ethernal free at tryethernal.com](https://tryethernal.com). Paste your RPC URL and get a working explorer in under 5 minutes. Upgrade to Team ($150/mo) when you need L2 bridge support and a custom domain.

---

## References

<span id="fn-1">1.</span> Arbitrum. "Monitoring Tools and Block Explorers." _docs.arbitrum.io_. [https://docs.arbitrum.io/build-decentralized-apps/reference/monitoring-tools-block-explorers](https://docs.arbitrum.io/build-decentralized-apps/reference/monitoring-tools-block-explorers)

<span id="fn-2">2.</span> Arbitrum. "L1 to L2 Messaging (Retryable Tickets)." _docs.arbitrum.io_. [https://docs.arbitrum.io/how-arbitrum-works/l1-to-l2-messaging](https://docs.arbitrum.io/how-arbitrum-works/l1-to-l2-messaging)

<span id="fn-3">3.</span> Arbitrum. "Monitoring Tools and Considerations." _docs.arbitrum.io_. [https://docs.arbitrum.io/launch-orbit-chain/reference/monitoring-tools-and-considerations](https://docs.arbitrum.io/launch-orbit-chain/reference/monitoring-tools-and-considerations)

<span id="fn-4">4.</span> Arbitrum. "Data Availability." _docs.arbitrum.io_. [https://docs.arbitrum.io/how-arbitrum-works/data-availability](https://docs.arbitrum.io/how-arbitrum-works/data-availability)

<span id="fn-5">5.</span> OffchainLabs. "Arbitrum Monitoring." _GitHub_. [https://github.com/OffchainLabs/arbitrum-monitoring](https://github.com/OffchainLabs/arbitrum-monitoring)

<span id="fn-6">6.</span> Arbitrum. "Orbit Quickstart." _docs.arbitrum.io_. [https://docs.arbitrum.io/launch-orbit-chain/orbit-quickstart](https://docs.arbitrum.io/launch-orbit-chain/orbit-quickstart)

<span id="fn-7">7.</span> Blockscout. Open-source block explorer and chain list. _blockscout.com_. [https://www.blockscout.com/](https://www.blockscout.com/)

<span id="fn-8">8.</span> Blockscout. "Autoscout: Managed Hosting." _docs.blockscout.com_. [https://docs.blockscout.com/using-blockscout/autoscout](https://docs.blockscout.com/using-blockscout/autoscout)

<span id="fn-9">9.</span> Ethernal. Block explorer for EVM chains. _tryethernal.com_. [https://tryethernal.com/](https://tryethernal.com/)

<span id="fn-10">10.</span> Routescan. "Arbitrum Orbit Explorer." _orbit.routescan.io_. [https://orbit.routescan.io/documentation](https://orbit.routescan.io/documentation)

<span id="fn-11">11.</span> Routescan. "Q1 2025 State of the Market." _X (Twitter)_, 2025. [https://x.com/routescan_io/status/1922227724443168979](https://x.com/routescan_io/status/1922227724443168979)

<span id="fn-12">12.</span> OffchainLabs. "Introducing Nova: Arbitrum AnyTrust Mainnet Is Open for Developers." _Medium_, 2022. [https://medium.com/offchainlabs/introducing-nova-arbitrum-anytrust-mainnet-is-open-for-developers-9a54692f345e](https://medium.com/offchainlabs/introducing-nova-arbitrum-anytrust-mainnet-is-open-for-developers-9a54692f345e)

<span id="fn-13">13.</span> Arbitrum. "Retryable Ticket Dashboard." _retryable-dashboard.arbitrum.io_. [https://retryable-dashboard.arbitrum.io/](https://retryable-dashboard.arbitrum.io/)

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Which block explorer works with Arbitrum Orbit chains?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Blockscout, Ethernal, and Routescan all support custom Arbitrum Orbit chain deployments. Arbiscan does not. It only covers Arbitrum One and Arbitrum Nova. For teams launching a custom Orbit L2 or L3, the choice is between Blockscout (bundled in the Orbit quickstart, GPLv3), Ethernal (MIT, native bridge UI, 5-minute setup), and Routescan (managed EaaS with a dedicated Orbit portal at orbit.routescan.io)."
      }
    },
    {
      "@type": "Question",
      "name": "Can I use Arbiscan for my Orbit chain?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. Arbiscan is a per-chain deployment operated by the Etherscan team specifically for Arbitrum One and Arbitrum Nova. It cannot be self-hosted, and there is no process for requesting coverage for a custom Orbit chain. Arbiscan is useful for looking up parent-chain transactions on Arbitrum One or Nova, but it will not index your chain."
      }
    },
    {
      "@type": "Question",
      "name": "What is the fastest way to get an explorer for an Orbit chain?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Ethernal's managed hosting is the fastest path: paste your RPC URL and your explorer starts indexing in minutes with no infrastructure setup. Blockscout is the next fastest if you are already running the Orbit quickstart setup script, which bundles Blockscout via Docker Compose. Routescan requires a contact-sales process and is not self-serve."
      }
    },
    {
      "@type": "Question",
      "name": "Does any explorer support AnyTrust DAC certificate display?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "AnyTrust-specific display (showing whether a batch used a DA certificate vs. full rollup fallback) is an under-documented feature across all explorers. No provider clearly confirms this feature for custom Orbit deployments. Blockscout has production instances for Arbitrum Nova that can serve as a reference. Ethernal's MIT license allows teams to fork and implement custom DAC display without copyleft constraints."
      }
    },
    {
      "@type": "Question",
      "name": "What is the cheapest way to run a block explorer for an Orbit chain?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Self-hosting Blockscout or Ethernal on your own infrastructure has no per-month SaaS cost. Ethernal requires only Docker and a server; Blockscout requires Elixir/Erlang operations experience in addition to Docker. Ethernal's managed hosting starts at $0 (Starter plan, ad-supported). L2 bridge support in Ethernal's managed hosting starts at $150/mo on the Team plan."
      }
    },
    {
      "@type": "Question",
      "name": "How does Blockscout bridge support compare to Ethernal for Orbit chains?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Blockscout has Arbitrum-specific tabs on its hosted Arbitrum One and Nova instances. For custom Orbit chains deployed via self-hosting, bridge UI is configuration-dependent. Ethernal includes native bridge support (deposit tracking, withdrawal claim status, batch monitoring) for Orbit chains as part of the product, with no additional configuration required on the Team plan."
      }
    }
  ]
}
</script>
