---
title: "The Config Line That Cost $292 Million"
description: "Kelp DAO's contracts weren't buggy. A one-line DVN threshold was. Why cross-chain message verification config sits outside what a code audit checks."
date: 2026-10-15
tags:
  - Security
  - Auditing
  - Cross-Chain
  - Smart Contracts
keywords: []
image: "/blog/images/the-config-line-that-cost-292-million.png"
ogImage: "/blog/images/the-config-line-that-cost-292-million-og.png"
status: published
readingTime: 7
---

April 18, 2026, 17:35 UTC. Kelp DAO's Ethereum `OFTAdapter` contract processes a LayerZero packet claiming to be a burn event from Unichain. No such transaction exists on Unichain. The message is fabricated end to end. One verifier signs off on it anyway, because Kelp's configuration only required one.<sup>[1](#fn-1)</sup>

116,500 rsETH, roughly $292 million, releases in a single transaction. A second attempt eleven minutes later, for another $100 million, gets blocked, but only after the team scrambles to pause the contract 46 minutes after the first drain.<sup>[2](#fn-2)</sup>

Kelp's contracts were not buggy. They did exactly what their configuration told them to do.

## What a "Security Stack" actually is

LayerZero V2 splits cross-chain messaging into three pieces: an immutable Endpoint contract on each chain, a pool of Decentralized Verifier Networks (DVNs) that attest to source-chain events, and Executors that deliver already-verified messages.<sup>[3](#fn-3)</sup> The Endpoint is universal and permissionless. It cannot be upgraded. DVNs are the part that actually does the work of deciding whether a message is real, and each application configures its own threshold for how many DVNs must agree before a message is trusted.

That threshold is modeled as X-of-Y-of-N: X DVNs that are always required, Y total verifications needed, N total DVNs in the application's chosen pool. It's set per communication pathway in a `UlnConfig` struct:<sup>[4](#fn-4)</sup>

```solidity
struct UlnConfig {
    uint8 requiredDVNCount;      // X
    uint8 optionalDVNCount;      // N - X
    uint8 optionalDVNThreshold;  // Y - X
    address[] requiredDVNs;
    address[] optionalDVNs;
}
```

LayerZero's own docs show a range of configurations: 2-of-2-of-2, where both DVNs must independently verify every message, 1-of-2-of-3, where one mandatory DVN plus any one of two optional DVNs is enough, and heavier setups like 2-of-4-of-6 for applications that want redundancy across more operators. This is explicit, documented flexibility. LayerZero's pitch to integrators is that the threshold is a cost-versus-security knob: run cheap with fewer required DVNs, or run paranoid with more DVNs from independent operators. Neither choice is a bug. The protocol is doing exactly what it says it does.

## The 1-of-1 that backed $1 billion

Kelp's Ethereum `OFTAdapter` (`0x85d456B2DfF1fd8245387C0BfB64Dfb700e98Ef3`) was configured with `requiredDVNCount = 1`, a single named DVN address, and zero optional DVNs.<sup>[1](#fn-1)</sup> That pathway backed approximately $1.07 billion of EigenLayer-restaked collateral, with rsETH deployed across Base, Arbitrum, Linea, Blast, Mantle, Scroll, and more than a dozen other chains, all redeemable against the same Ethereum reserve.<sup>[2](#fn-2)</sup>

With one required DVN, the attacker only needed to compromise one. Halborn's post-incident analysis describes a combination of DDoS against the DVN's external nodes and compromise of internal RPC infrastructure, which let the attacker feed the DVN false data.<sup>[5](#fn-5)</sup> The DVN attested to a burn that never happened. The Ethereum Endpoint had no second DVN to disagree with it, so it released the funds.

Stolen rsETH was deposited as collateral on Aave V3 to borrow WETH into an unliquidatable position, and roughly 52,440 ETH moved through consolidation addresses before the pause landed.<sup>[2](#fn-2)</sup> Chainalysis and multiple outlets attribute the exploit to Lazarus Group, noting it was the second nine-figure theft by the same group inside three weeks.<sup>[6](#fn-6)</sup> Kelp's response was to migrate rsETH's verification from LayerZero to Chainlink.

The same shape showed up again five months later, on a different interoperability stack. On October 13, 2026, 19 million unauthorized THEO tokens appeared on Base with no legitimate mint event behind them. Autheo routes THEO across its own mainnet, Base, and Robinhood Chain using Hyperlane-based bridge infrastructure. Roughly 700.8 ETH, about $1.76 million, was extracted by swapping the minted tokens, and the price fell from around $0.08 to $0.006 within 24 hours.<sup>[7](#fn-7)</sup> THEO's token contract had been audited three separate times, by Halborn, CertiK, and Avelar Labs.<sup>[7](#fn-7)</sup>

Two incidents, two different verification stacks, same structural gap: the thing that broke wasn't the contract code. It was a deployment-time trust threshold that a standard audit has no reason to flag, because the configuration is valid under the protocol's own spec.

## Why code audits don't catch this

A smart contract review checks the Solidity implementing the OApp or OFT interface against the integration spec. `requiredDVNCount = 1` is valid per that spec. There's no line of code to mark as wrong, no function that violates a check, no missing modifier. The question of whether one required DVN is *adequate* for a pathway backing nine figures of TVL is a deployment and risk decision, not a code-correctness one. It's also rarely re-reviewed as TVL grows past whatever it was when the config was first set.

TechReport's framing of the THEO incident captures the gap directly:

> A review checks the code of the contracts it is hired to examine, at a point in time, against the attack patterns its auditors know.<sup>[8](#fn-8)</sup>

Bridge deployment, which depends on message verification across chains and off-chain relayers and validators, typically sits outside that scope regardless of how many firms sign off on the token contract itself. Autheo's root cause was still unconfirmed at time of writing, and that ambiguity is itself the point: whether the fault sits in Autheo's specific deployment or in shared Hyperlane infrastructure, three separate audits of the token contract caught none of it.

| What gets audited | What a config audit would need to check |
|---|---|
| Token contract logic (mint, burn, transfer) | Required DVN count per pathway |
| Access control on privileged functions | Whether required DVNs are independently operated |
| Reentrancy, overflow, standard interface compliance | Whether the threshold was set before or after TVL on the pathway grew |
| Upgrade authorization | Monitoring for destination-chain events with no corresponding source-chain transaction |

## Closing the gap

The post-incident guidance from Blockaid and Halborn isn't generic. It maps directly onto what actually failed:<sup>[1](#fn-1)</sup><sup>[5](#fn-5)</sup>

1. Treat verifier thresholds as a live risk parameter tied to current TVL on the pathway, not a one-time deploy setting. Re-review it the way you'd re-review an admin key policy, on a schedule, not once.
2. Require independent operators across all required DVNs, so no single compromised party can unilaterally attest to a message.
3. Use optional-DVN thresholds for defense in depth rather than relying on the required set alone.
4. Add cosigner or multisig controls on signing infrastructure, not just on the smart contract's admin functions.
5. Build standing monitoring for the exact anomaly every post-mortem names after the fact: a destination-chain mint or release with no corresponding verified source-chain event. Kelp caught it in 46 minutes. The guidance from every incident report since is to catch it faster than that.

That last point is where a team's own infrastructure matters, separate from the bridge vendor's security. No general-purpose single-chain explorer surfaces a cross-chain correlation gap by default. For a team running its own chain's explorer and alerting, "sourceless packet" detection, a mint event with nothing on the other side to back it, is a workspace-level monitoring rule worth wiring up before a bridge event happens, not a forensic step performed after one.

The audit secures the code. The deployment config secures the money. Almost nobody treats them as the same document.

---

## References

<span id="fn-1">1.</span> Blockaid. "How a Single LayerZero DVN Compromise Drained $292M from KelpDAO." _blockaid.io_, April 2026. [https://blockaid.io/blog/how-a-single-layerzero-dvn-compromise-drained-292m-from-kelpdao](https://blockaid.io/blog/how-a-single-layerzero-dvn-compromise-drained-292m-from-kelpdao)

<span id="fn-2">2.</span> CoinDesk. "2026's Biggest Crypto Exploit: Kelp DAO Hit for $292 Million With Wrapped Ether Stranded Across 20 Chains." _coindesk.com_, April 2026. [https://www.coindesk.com/tech/2026/04/19/2026-s-biggest-crypto-exploit-kelp-dao-hit-for-usd292-million-with-wrapped-ether-stranded-across-20-chains](https://www.coindesk.com/tech/2026/04/19/2026-s-biggest-crypto-exploit-kelp-dao-hit-for-usd292-million-with-wrapped-ether-stranded-across-20-chains)

<span id="fn-3">3.</span> LayerZero Labs. "LayerZero Protocol Architecture." _docs.layerzero.network_. [https://docs.layerzero.network/v2/concepts/layerzero-protocol-architecture](https://docs.layerzero.network/v2/concepts/layerzero-protocol-architecture)

<span id="fn-4">4.</span> LayerZero Labs. "LayerZero V2 Deep Dive." _layerzero.network/blog_. [https://layerzero.network/blog/layerzero-v2-deep-dive](https://layerzero.network/blog/layerzero-v2-deep-dive)

<span id="fn-5">5.</span> Halborn. "Explained: The Kelp DAO Hack (April 2026)." _halborn.com_, April 2026. [https://www.halborn.com/blog/post/explained-the-kelp-dao-hack-april-2026](https://www.halborn.com/blog/post/explained-the-kelp-dao-hack-april-2026)

<span id="fn-6">6.</span> Chainalysis. "Inside the KelpDAO Bridge Exploit." _chainalysis.com_, April 2026. [https://www.chainalysis.com/blog/kelpdao-bridge-exploit-april-2026/](https://www.chainalysis.com/blog/kelpdao-bridge-exploit-april-2026/)

<span id="fn-7">7.</span> crypto.news. "Autheo THEO Token Plunges 92% After Suspected Bridge Exploit." _crypto.news_, October 2026. [https://crypto.news/autheo-theo-plunges-suspected-bridge-exploit](https://crypto.news/autheo-theo-plunges-suspected-bridge-exploit)

<span id="fn-8">8.</span> TechReport. "THEO Hack: Audited Three Times, Exploited Anyway." _techreport.com_, October 2026. [https://techreport.com/news/software/theo-hack-funds-off-base-recovery-hard/](https://techreport.com/news/software/theo-hack-funds-off-base-recovery-hard/)
