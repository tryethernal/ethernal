---
title: "The Free Option Hidden in ePBS: Why Builders Can Walk Away From a Committed Block"
description: "EIP-7732 gives builders a short window to walk away from committed payloads. Research puts the average withhold rate at 0.82%, up to 6% on volatile days."
date: 2026-06-18
tags:
  - Ethereum
  - EIP-7732
  - ePBS
  - MEV
  - Protocol
  - Glamsterdam
keywords: []
image: "/blog/images/epbs-free-option-problem-eip-7732.png"
ogImage: "/blog/images/epbs-free-option-problem-eip-7732-og.png"
status: published
readingTime: 8
---

A block slot opens. A builder wins the auction and commits to a payload worth 0.5 ETH in fees. The proposer's commitment goes on-chain. Validators attest. Then the builder checks the ETH/USD feed. The price moved 0.8% in the last four seconds. The arbitrage trade embedded in the payload is now unprofitable. The builder withholds the blob. The slot is empty.

No additional penalty. The proposer still collects the bid. Payment was deducted from the builder's staked balance at the moment of commitment. The builder avoids a losing trade. The network produced no block.

This is the free option problem: a structural liveness risk introduced by EIP-7732 (enshrined proposer-builder separation, scheduled for Glamsterdam, H2 2026) that does not exist in today's MEV-Boost system. Research from Bruno Mazorra, Burak Öz, and Christoph Schlegel (Flashbots) and Fei Wu (King's College London) puts the average exercise rate at 0.82% of blocks, rising to 6% on high-volatility trading days.<sup>[3](#fn-3)</sup>

## The relay in the middle

Roughly 90% of validators use MEV-Boost today.<sup>[5](#fn-5)</sup> The system works like this: a proposer connects to one or more relays, which aggregate bids from block builders. The relay acts as a trusted intermediary: it guarantees the proposer won't receive an invalid block, and guarantees the builder's payload won't be taken without payment.

The trust assumption is explicit, and reputation is the only enforcement mechanism. Relays can submit fraudulent bids. Flashbots operates most relays. There is no on-chain accountability. The system works because participants watch each other and reputations are worth protecting, not because the protocol enforces anything.

EIP-7732 removes the relay by moving these guarantees into the protocol itself.

## How EIP-7732 splits block production

Under ePBS, builders become staked protocol entities. The minimum builder stake is 1 ETH; the registry supports up to 2^40 builders. Block production splits into three phases:<sup>[1](#fn-1)</sup>

| Phase | What happens | Who benefits |
|-------|-------------|--------------|
| Commitment | Proposer includes `ExecutionPayloadBid`; bid deducted from builder stake and queued as a withdrawal to proposer | Proposer (paid regardless of what happens next) |
| Timeliness | 512-validator Payload Timeliness Committee (PTC) attests to payload reveal and blob availability | Network (liveness signal) |
| Execution | Full state transition once `ExecutionPayloadEnvelope` is received | Users (transactions process) |

The payment is trustless and unconditional. At Phase 1, the protocol transfers the bid value out of the builder's staked balance; the proposer is paid even if the builder never reveals the payload. This is exactly what ePBS was designed to achieve.

And it is exactly what creates the problem.

The PTC design is solid against attacks: the EIP-7732 specification puts the expected time for a 35% stake attacker to gain a PTC majority at 205,000 years.<sup>[1](#fn-1)</sup> Alongside the consensus layer changes, EIP-8282 adds two execution-layer predeploy contracts (0x03 for builder deposits, 0x04 for builder exits) so builders can manage their lifecycle from the EL using the same EIP-7685 request bus pattern proven in Prague.<sup>[2](#fn-2)</sup>

The protocol mechanics are sound. The economic mechanics are not.

## The window between commitment and reveal

After Phase 1 commitment, the builder has until the blob deadline (roughly 10 seconds in the current design) to reveal the `ExecutionPayloadEnvelope`. During that window, the builder holds what amounts to a short-dated financial option.

If ETH price moves favorably, the builder reveals. Their trades execute, they capture the MEV. Standard outcome.

If ETH price moves adversely (specifically, if the CEX-DEX arbitrage positions embedded in the payload become unprofitable), the builder can withhold the blob, rendering the slot empty. The builder loses the staked bid (already paid to the proposer at commitment), but avoids the larger loss from executing bad trades.

The decision rule is straightforward:

```
Reveal if:   expected_trade_pnl > 0
Withhold if: expected_loss_from_trades > bid_already_forfeited
             (no additional protocol penalty applies)
```

The proposer's unconditional payment (the feature that makes ePBS trustless) is precisely what makes withholding rational. The protocol has already paid the proposer. The builder's only remaining exposure is the trade itself.

Mazorra et al. modeled this across builders with different flow compositions, and the heterogeneity in exercise rates is the most revealing data point:<sup>[3](#fn-3)</sup>

| Builder | Withhold rate | Flow profile |
|---------|--------------|--------------|
| beaverbuild | 0.66% | Diversified order flow |
| Titan | 0.75% | Diversified order flow |
| gigabuilder | 23.44% | Heavily CEX-DEX dependent |

gigabuilder's 23% rate is not a misconfiguration. It reflects a business model that extracts most of its value from latency-sensitive CEX-DEX arbitrage. Under ePBS, builders deeply reliant on that flow face the highest free option exposure because their payload value is most sensitive to price movements during the reveal window.

At network scale: 0.82% average across all builders. On volatile trading days, up to 6%. Neither number is catastrophic, but both are non-trivial for a protocol that targets 12-second slots and consistent liveness.

## How the community is fixing it

Three classes of mitigation are under active research and discussion.

### Shorten the option window

A shorter reveal window reduces the time during which an adverse price move can render the payload unprofitable. The effect is roughly proportional to the window reduction:

| Window | Reduction in withhold rate |
|--------|---------------------------|
| 8s (baseline) | 0% (baseline) |
| 6s | more than 33% |
| 4s | more than 50% |
| 2s | more than 77% |

The tradeoff is blob propagation time. PTC members need to receive blob data before they can attest to availability. A 2-second window is tight. Whether it is achievable in practice depends on network conditions still being characterized on devnets.

### Static penalties

Adding a fixed slash on top of the forfeited bid changes the builder's calculus directly. A 0.075 ETH penalty reduces the average exercise rate by approximately 75%. At 0.5 ETH, the reduction reaches approximately 87%.<sup>[3](#fn-3)</sup>

The problem with static penalties is that they hit honest builders too. A builder whose blob genuinely failed to propagate due to network conditions faces the same penalty as one making a deliberate trade-off. This creates pressure to over-bid defensively and may concentrate building further among operators with the capital buffer to absorb occasional penalties.

### Dynamic penalties

The most sophisticated proposal comes from Christoph Schlegel, Bruno Mazorra, and co-authors including potuz and Leo Arias.<sup>[4](#fn-4)</sup> Rather than a fixed penalty, the mechanism adjusts based on the rolling payload delivery failure rate.

The state variable increases steeply on each failure and decreases slowly on each success. The asymmetric step sizes keep penalties sticky: a builder who occasionally withholds cannot reset their exposure by running cleanly for a few slots.

| Parameter | Value |
|-----------|-------|
| PENALTY_STEP_SIZE | 20,000,000 Gwei (upward) |
| PENALTY_DOWN_STEP_SIZE | 100,000 Gwei (downward) |
| MAX_PENALTY | 8,000,000,000 Gwei (roughly 8 ETH) |
| Target failure rate α | approximately 0.49% |
| Evaluation window | approximately 2,475 slots |

Backtesting against January 2024 through March 2025 data gives a mean penalty of 0.03 ETH and a maximum observed penalty of approximately 0.47 ETH, comparable to a missed beacon block proposal reward, and achievable without restructuring the builder registry.

The comparison across all three approaches:

| Mitigation | Average withhold rate | Tradeoff |
|-----------|----------------------|----------|
| No change (8s window) | 0.82% | Baseline |
| Shorten to 2s | approximately 0.18% | Blob propagation pressure |
| Static 0.075 ETH penalty | approximately 0.21% | Penalizes honest failures equally |
| Dynamic penalty | approximately 0.096% | Parameter tuning complexity |

Dynamic penalties reach the lowest observed exercise rate and adapt to actual builder behavior rather than assuming a static risk profile. The open question is whether the parameters (particularly the target failure rate α) can be correctly set before deployment or require post-launch tuning. That is not a small question: getting it wrong in either direction either fails to deter withholding or starts punishing builders for conditions outside their control.

## Is the problem worth the upgrade?

Not everyone agrees it is. Dapplion, a Rust engineer at Sigma Prime (the Lighthouse client team), published a direct case against including EIP-7732 in Glamsterdam.<sup>[6](#fn-6)</sup> The argument: MEV-Boost is performing adequately with infrequent incidents, the main scaling wins from payload splitting and delayed execution could be achieved without the full trustless payment mechanism, and the capital barrier from staked builder requirements will increase concentration in an already centralized market.

EIP-7886 (delayed execution) is cited as a lighter alternative that captures some of the same scaling benefits without the full ePBS commitment overhead.

The debate is genuine. The free option problem is partly a consequence of the trustless payment design (the feature that distinguishes ePBS from MEV-Boost in the first place). Removing or weakening that payment guarantee to reduce the free option risk would narrow the gap between ePBS and the current system it aims to replace. There is something uncomfortable about that circularity.

EIP-7732 remains a confirmed Glamsterdam EIP alongside EIP-7928 (block-level access lists), and the mitigation research is active. But the Sigma Prime objection is worth understanding: the free option problem is not a bug that will be patched before ship. It is a structural consequence of the design, and the mitigations are being layered on top.

## What this changes for block explorers and operators

Under MEV-Boost, an empty slot has one interpretation: a proposer missed their window. That is the only root cause available today.

Under ePBS, empty slots have two distinct causes: proposer failure (existing) and builder withhold (new in Glamsterdam). The PTC attestation data is on-chain. Every block will carry a record of whether the 512-validator Payload Timeliness Committee observed a timely reveal and confirmed blob availability, or did not, and why.

New on-chain data types that become visible after Glamsterdam:

- **Builder index per block**: which staked builder committed to the payload
- **PTC vote outcome**: did the committee see a timely reveal and blob availability?
- **Slot attribution**: proposer-missed vs. builder-withheld, distinguishable from on-chain records
- **Builder lifecycle events**: EIP-8282 predeploy contracts at 0x03 (deposit) and 0x04 (exit) emit standard EL logs for builder registry changes

When Glamsterdam ships, Ethernal will surface PTC results, builder identifiers, and withhold attribution alongside existing transaction trace, decoded event, and contract views, turning a subtle economic behavior into something observable and auditable on-chain.

## Frequently asked questions

### What is the ePBS free option problem?

The free option problem is a liveness risk in EIP-7732 (enshrined proposer-builder separation). Under ePBS, a builder commits to a payload and pays the proposer at commitment time. Between commitment and the reveal deadline, the builder holds the option to withhold the payload if market conditions make their embedded trades unprofitable. Since payment is already made, withholding incurs no additional protocol penalty; only the bid already forfeited. Research from Flashbots and King's College London puts the average withhold rate at 0.82%, rising to 6% on high-volatility days.

### Does the free option problem exist in MEV-Boost today?

No. Under MEV-Boost, the relay holds both the payload and the payment. The builder does not receive the signature to publish the block until the proposer's signed header is delivered. There is no commitment-before-reveal phase, so there is no window in which withholding is a rational option. The free option problem is specific to ePBS's trustless payment mechanism.

### How is the free option problem being addressed?

Three approaches are under research: shortening the reveal window (reduces exercise rates by more than 77% at 2 seconds), static penalties on top of the forfeited bid (0.075 ETH reduces rates by approximately 75%), and dynamic penalties that adjust based on the rolling failure rate. Dynamic penalties, proposed by Schlegel, Mazorra, and co-authors, achieve the lowest backtested exercise rate (approximately 0.096%) with a mean observed penalty of 0.03 ETH.

### Is EIP-7732 still planned for Glamsterdam?

Yes. EIP-7732 is one of Glamsterdam's ten confirmed EIPs, alongside EIP-7928 (block-level access lists). Glamsterdam is targeting mainnet in H2 2026 and has entered its final devnet phase at a 200 million gas limit target. Debate about the free option problem is ongoing, but as of June 2026 the EIP remains included.

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is the ePBS free option problem?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The free option problem is a liveness risk in EIP-7732 (enshrined proposer-builder separation). Under ePBS, a builder commits to a payload and pays the proposer at commitment time. Between commitment and the reveal deadline, the builder holds the option to withhold the payload if market conditions make their embedded trades unprofitable. Since payment is already made, withholding incurs no additional protocol penalty; only the bid already forfeited. Research from Flashbots and King's College London puts the average withhold rate at 0.82%, rising to 6% on high-volatility days."
      }
    },
    {
      "@type": "Question",
      "name": "Does the free option problem exist in MEV-Boost today?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. Under MEV-Boost, the relay holds both the payload and the payment. The builder does not receive the signature to publish the block until the proposer's signed header is delivered. There is no commitment-before-reveal phase, so there is no window in which withholding is a rational option. The free option problem is specific to ePBS's trustless payment mechanism."
      }
    },
    {
      "@type": "Question",
      "name": "How is the free option problem being addressed?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Three approaches are under research: shortening the reveal window (reduces exercise rates by more than 77% at 2 seconds), static penalties on top of the forfeited bid (0.075 ETH reduces rates by approximately 75%), and dynamic penalties that adjust based on the rolling failure rate. Dynamic penalties, proposed by Schlegel, Mazorra, and co-authors, achieve the lowest backtested exercise rate (approximately 0.096%) with a mean observed penalty of 0.03 ETH."
      }
    },
    {
      "@type": "Question",
      "name": "Is EIP-7732 still planned for Glamsterdam?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. EIP-7732 is one of Glamsterdam's ten confirmed EIPs, alongside EIP-7928 (block-level access lists). Glamsterdam is targeting mainnet in H2 2026 and has entered its final devnet phase at a 200 million gas limit target. Debate about the free option problem is ongoing, but as of June 2026 the EIP remains included."
      }
    }
  ]
}
</script>

## References

<span id="fn-1">1.</span> Ethereum Foundation. "EIP-7732: Enshrined Proposer-Builder Separation (ePBS)." _Ethereum Improvement Proposals_, 2024. [https://eips.ethereum.org/EIPS/eip-7732](https://eips.ethereum.org/EIPS/eip-7732)

<span id="fn-2">2.</span> Ethereum Foundation. "EIP-8282: Builder Execution Requests." _GitHub Pull Request #11760_, June 2026. [https://github.com/ethereum/EIPs/pull/11760](https://github.com/ethereum/EIPs/pull/11760)

<span id="fn-3">3.</span> Mazorra, B., Öz, B., Schlegel, C., Wu, F. "The Free Option Problem of ePBS." _arXiv_, 2025. [https://arxiv.org/abs/2509.24849](https://arxiv.org/abs/2509.24849)

<span id="fn-4">4.</span> Schlegel, C., Mazorra, B., et al. "Dynamic Penalties for ePBS." _ethresear.ch_, 2025. [https://ethresear.ch/t/dynamic-penalties-for-epbs/23472](https://ethresear.ch/t/dynamic-penalties-for-epbs/23472)

<span id="fn-5">5.</span> Koegler, M. "SoK: Current State of Ethereum's Enshrined Proposer Builder Separation." _arXiv_, June 2026. [https://arxiv.org/html/2506.18189](https://arxiv.org/html/2506.18189)

<span id="fn-6">6.</span> Dapplion. "The case against EIP-7732 for Glamsterdam." _Sigma Prime Blog_, 2026. [https://sigmaprime.io/blog/glamsterdam-eip7732/](https://sigmaprime.io/blog/glamsterdam-eip7732/)

<span id="fn-7">7.</span> Ethereum Foundation. "Glamsterdam upgrade overview." _ethereum.org_, 2026. [https://ethereum.org/roadmap/glamsterdam](https://ethereum.org/roadmap/glamsterdam)
