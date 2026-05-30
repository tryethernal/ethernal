---
title: "After the Audit: The Monitoring Stack That Catches What Static Analysis Can't"
description: "Your audit covers the code on the day it was reviewed. Post-deployment monitoring covers every day after. Here's what the stack looks like."
date: 2026-05-30
tags:
  - Security
  - Auditing
  - Smart Contracts
  - DeFi
image: "/blog/images/after-the-audit-post-deployment-monitoring-stack.png"
ogImage: "/blog/images/after-the-audit-post-deployment-monitoring-stack-og.png"
status: published
readingTime: 7
---

Team Finance had passed an external audit. On November 18, 2022, an attacker deployed an exploit contract targeting it. Forta's ML detection model flagged that contract one hour before the first malicious transaction landed. Nobody at Team Finance was subscribed to those alerts. $15.8 million drained before the block cleared.<sup>[2](#fn-2)</sup>

The audit did not fail. The monitoring layer simply did not exist.

## Why an audit expires the moment you deploy

Audits are point-in-time reviews. They inspect the code as written against a known set of vulnerability patterns. [We covered what those patterns miss in an earlier post](/blog/the-bug-auditors-tools-miss) -- logical bugs, reward accounting errors, mechanism design flaws that no automated detector flags. [The Knowdit piece showed how AI auditing starts to close that gap](/blog/ai-auditor-knowdit-code4rena) using knowledge graphs built from 270 competitive audit reports.

Both are pre-deployment approaches. They evaluate code before users touch it.

The problem is that deployed protocols do not stay in the state they were audited in. Composability means your threat model changes without a line of your code changing. The lending protocol your vault integrates with upgrades its oracle path. A governance proposal adjusts a fee structure. A new liquidity pool creates a cross-contract callback sequence nobody designed for. None of that invalidates the audit. It just makes the audit stale.

The numbers bear this out. DeFi protocols lost $482 million in Q1 2026. Smart contract losses are up 213% year over year.<sup>[1](#fn-1)</sup> Many of those protocols had audits.

## What automated monitoring actually detects

Post-deployment monitoring operates at three levels, each targeting a different window in an attack lifecycle.

### Exploit contract deployment: before the attack lands

This is where Forta's ML model works.<sup>[2](#fn-2)</sup> The model runs logistic regression on EVM opcodes, treating contract bytecode as text and applying TF-IDF weighting across 1-4 n-gram sequences. It was trained on approximately 100 labeled malicious contracts and 130,000 verified benign contracts.

Exploit contracts have a distinctive opcode fingerprint:

- Heavy PUSH20 opcodes: the contract interacts with many protocol addresses, consistent with moving funds across multiple targets.
- Absent SHA3 opcodes: no storage hashing, no access control checks. The contract does not need to read or guard state because it only writes.
- Absent PUSH32 opcodes: no Keccak topic hashing, which means no event emissions. The contract deliberately hides its activity from event logs.

MEV bots produce similar signals, which is the primary false-positive source. In 2026 the false-positive rate is approximately 1 per 5 million transactions.<sup>[3](#fn-3)</sup>

The timing data from real incidents shows what this looks like in practice:

| Incident | Loss | Detection Before Exploit |
|----------|------|--------------------------|
| DFX Finance | $7.5M | 6 minutes |
| Olympus DAO | $300K | 2 minutes |
| Team Finance | $15.8M | 1 hour |

These are detections of the attacker's staging contract before the first malicious call. Not alerts after the drain. Before.

### Flash loan attack patterns: during execution

Flash loan attacks have a recognizable on-chain structure that monitoring can flag in real time.<sup>[4](#fn-4)</sup> Research on non-price flash loan attack taxonomy identifies four structural signatures visible in the transaction call tree:

- Atomic execution: the entire attack sequence lives in one block. The flash loan provider appears in the call tree and receives repayment at the end.
- Cross-protocol call sequence: three or more protocol contracts called sequentially within a single transaction, a pattern rarely present in normal user behavior.
- Unusual call ordering: withdraw before deposit, claim before stake, callback before transfer. The ordering signals that the attacker is exploiting a sequencing assumption.
- Near-zero net balance change for the borrower's flash loan: the loan is repaid in the same transaction, making the capital usage invisible to naive balance checks.

Governance attacks follow the same pattern: flash-borrow voting tokens, pass a malicious proposal, repay the loan. All in one transaction.

### Behavioral anomalies: after execution

Post-execution monitoring tracks sudden balance spikes or drains against baseline variance, gas consumption anomalies on calls that should be computationally cheap, and event log gaps where the contract's normal flow always emits events. Behavioral anomaly detection catches exploits that do not use flash loans and do not deploy fresh contracts -- slow-burn attacks that extract funds across many transactions over time.

## What automated monitoring misses

The recall rate on Forta's model is 59.4%.<sup>[2](#fn-2)</sup> Roughly 40% of exploit contracts are not flagged before exploitation. Automated monitoring is necessary, not sufficient.

The gaps are structural:

Novel attack vectors have no training precedent. A vulnerability class that has never appeared in a labeled dataset produces no signal. The opcode fingerprinting above only works because someone labeled the training contracts correctly first.

Slow-burn extraction below detection thresholds is invisible to anomaly detectors calibrated on single-block events. An attacker draining a fraction of reserves per day over weeks may never trigger a threshold.

Legitimate governance is structurally identical to a governance attack. A token holder flash-borrowing to vote on a legitimate proposal looks exactly like an attacker doing the same thing. There is no opcode difference between "vote yes on the fee change" and "pass a proposal to drain the treasury."

MEV false positives share the same opcode profile as malicious contracts. At scale, filtering MEV from genuine exploits requires additional signal beyond bytecode alone.

Monitoring narrows the window of exploitation. It does not close it.

## What a flash loan attack looks like in a decoded trace

Automated alerts tell you something suspicious happened. Traces tell you what.

When monitoring fires on a suspicious transaction, the next step is reading the call tree. Here is what a flash loan exploit looks like in decoded form:

```
Transaction: 0xabc...
├── Aave: flashLoan(1,000 ETH)
│   ├── Attacker.execute()
│   │   ├── VulnerableVault.withdraw(1,000 ETH)   [balance delta: -1,000 ETH]
│   │   ├── DEX.swap(ETH → tokenX)
│   │   └── VulnerableVault.deposit(1 ETH)         [accounting manipulated]
│   └── Aave.repay(1,000 ETH + fee)
└── Events: [none emitted by attacker contract]
```

Three things are immediately readable. The flash loan provider bookends the call tree. The balance delta on `VulnerableVault.withdraw` is 1,000 ETH while the corresponding deposit is 1 ETH -- the accounting mismatch is explicit. The events line is empty: the attacker contract emitted nothing, exactly what the absent PUSH32 opcode signature predicts.

For teams running on public chains, Etherscan surfaces this view. For L2 and L3 operators on private networks, there is no public explorer. Ethernal fills that role -- connecting to the private RPC and rendering the decoded call tree with internal state transitions and event logs at each step. When an alert fires on a chain where you are the only operator, you need your own trace review layer. [Transaction tracing with Ethernal](/blog/transaction-tracing-with-ethernal) covers the mechanics.

## Building the stack: four layers

Protocols with active monitoring and automated response reduce average loss per incident by 80%.<sup>[1](#fn-1)</sup> The architecture that produces that result has four distinct layers:

| Layer | Tool | Function |
|-------|------|----------|
| Detection | Forta / Hypernative | Alert on suspicious contracts and behavioral patterns |
| Response | OpenZeppelin Defender | Automated pause, circuit breaker activation |
| Verification | Block explorer (Ethernal for private chains) | Human-readable trace review on alert |
| Post-mortem | Full trace replay | Complete state reconstruction |

The automation-to-human handoff matters. Automated response is fast enough to be useful at attack timescales -- a circuit breaker that fires within seconds can cap losses. But false positives from MEV bots mean blanket automation without human verification creates a denial-of-service vector. The workflow that avoids both failure modes: automated alert triggers human review of the decoded trace, human confirms before escalating to a full pause.

OpenZeppelin Defender handles the automated response layer. Forta and Hypernative handle detection. Hexagate offers a similar monitoring approach with a focus on transaction simulation pre-execution. Combining detection sources reduces the roughly 40% miss rate that any single system carries.

## The gap the audit does not cover

An audit covers the code on the day it was reviewed. Monitoring covers the protocol every day after that.

These are different tools for different threat models. Slither, formal verification, AI auditing: all of them operate on a static snapshot. The live environment is adversarial and dynamic. Composability means the attack surface grows with every protocol integration, every upgrade, every new pool in a liquidity ecosystem.

Team Finance's audit was clean. One hour of monitoring signal went unread. The two facts are not in contradiction -- they represent different layers of a security posture that treated the first as a substitute for the second.

Building both is not optional for protocols holding meaningful TVL. The audit gets you to deployment. Monitoring is what keeps you there.

---

## References

<span id="fn-1">1.</span> Hacken. "Smart Contract Security Guide." _hacken.io_, 2026. [https://hacken.io/discover/smart-contract-security-guide/](https://hacken.io/discover/smart-contract-security-guide/)

<span id="fn-2">2.</span> Forta Network. "How Forta's Predictive ML Models Detect Attacks Before Exploitation." _forta.org_, 2022. [https://www.forta.org/blog/how-fortas-predictive-ml-models-detect-attacks-before-exploitation](https://www.forta.org/blog/how-fortas-predictive-ml-models-detect-attacks-before-exploitation)

<span id="fn-3">3.</span> Forta Network. "Forta 2025: A Breakout Year for On-Chain Risk Management Infrastructure." _forta.org_, 2026. [https://forta.org/blog/forta-2025-a-breakout-year-for-on-chain-risk-management-infrastructure](https://forta.org/blog/forta-2025-a-breakout-year-for-on-chain-risk-management-infrastructure)

<span id="fn-4">4.</span> Chen, J. et al. "Beyond Oracle Manipulation: A Taxonomy of Non-Price Flash Loan Attacks." _arXiv_, March 2025. [https://arxiv.org/pdf/2503.01944](https://arxiv.org/pdf/2503.01944)
