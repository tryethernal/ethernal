---
title: "The Security Scanner You Trust Was Never Benchmarked"
description: "A 2026 academic study ran six static analyzers against 653 contracts. F1 scores ranged from 31% to 95% on reentrancy, the bug class everyone assumes is solved."
date: 2026-10-23
tags:
  - Security
  - Auditing
  - Smart Contracts
  - Static Analysis
keywords: []
image: "/blog/images/smart-contract-scanner-benchmark.png"
ogImage: "/blog/images/smart-contract-scanner-benchmark-og.png"
status: published
readingTime: 7
---

Two teams fork the same open-source lending contract. Team A runs Slither in CI and ships clean. Team B runs Mythril against the identical commit and gets a reentrancy finding. Same source code, same compiler version, same vulnerability class, two different verdicts.

That disagreement isn't about an ambiguous logical bug buried in business logic. It's about reentrancy, the single vulnerability category every team assumes static analysis has nailed down for years. A 2026 academic benchmark shows it hasn't. Researchers at NYU Abu Dhabi ran six widely used analyzers against the same 653 real-world contracts and found F1 scores ranging from 31.2% to 94.6% on the categories the industry treats as solved.<sup>[1](#fn-1)</sup> Tool choice is not a commodity decision, and almost nobody has measured it.

## What "solved" bug classes actually look like under controlled measurement

Reentrancy, self-destruct misuse, and integer arithmetic errors sit on the OWASP Smart Contract Top Ten as the categories pattern-matching tools are supposed to catch reliably.<sup>[2](#fn-2)</sup> They're syntactic patterns, not the relational, cross-contract reasoning that trips up even good tools on logical bugs. If any bug class should produce consistent results across tools, it's these three.

Tamer Abdelaziz, Salma Alsaghir, and Karim Ali tested that assumption directly. Their MSR 2026 paper, "Where Do Smart Contract Security Analyzers Fall Short?", evaluated Confuzzius, Dlva, Mythril, Osiris, Oyente, and Slither against 653 real-world Solidity contracts, scoring each tool against ground-truth labels for reentrancy, suicidal (self-destruct) termination, and integer arithmetic errors.<sup>[1](#fn-1)</sup> The spread was not small:

| Metric | Range across tools |
|---|---|
| F1 score | 31.2% – 94.6% |
| False positive rate | up to 32.6% |
| Runtime per contract | up to 700+ seconds |

A tool at the bottom of that F1 range isn't missing an edge case. On reentrancy specifically, it's getting the basic pattern-matching job wrong more than two-thirds as often as the best tool in the comparison gets it right. Teams running one tool in CI have no way to know which end of that range they landed on, because almost nobody runs a second tool against the same contracts to find out.

## Why nobody noticed

Most teams pick a static analyzer once, early, and never revisit the choice. It's whatever shipped in the Foundry or Hardhat starter template, or whatever the last audit firm used and left behind in a CI config. Abdelaziz et al. surveyed 150 professional developers and auditors to find out why deeper evaluation doesn't happen, and the answer isn't that practitioners don't care about accuracy. It's that "excessive false positives, vague explanations, and long analysis times are the main barriers to trust and adoption in practice."<sup>[1](#fn-1)</sup> Teams aren't comparing accuracy and picking the losing tool anyway. They're not comparing accuracy at all, because the tool they have is already slow and noisy enough that running a second one feels like more pain for an unclear payoff.

That trust gap is wide enough that even the people who build these tools have had to work around it. Slither is Trail of Bits' own analyzer, and Trail of Bits still maintains a separate "Building Secure Contracts" guide on top of Slither's official documentation, covering the CI integration and workflow questions the tool's own docs don't fully answer.<sup>[3](#fn-3)</sup> If the authors of a leading scanner need a second guide to get teams using it correctly, the selection-and-adoption step is underserved industry-wide, not just at the margins.

The 150-developer survey and the F1 numbers describe two separate failures that compound each other: developers under-trust tools for UX reasons, so they never go looking for accuracy data, so the accuracy gap between tools stays invisible, so the UX-driven tool they settled on never has to justify itself against an alternative.

A related 2026 paper by Abdelaziz, "Smart Contract Security Beyond Detection," cites this same benchmark as one of two foundational diagnostics for a broader research agenda on closing the gap between tool capability and tool use.<sup>[4](#fn-4)</sup> The diagnosis has outlived the original paper; the fix is still open.

## What a 30-minute benchmark actually looks like

You don't need a research lab to find out where your tool sits in that F1 range. SmartBugs Curated is a public, ground-truth-labeled dataset: 143 contracts annotated with 208 tagged vulnerabilities across the standard DASP taxonomy, including reentrancy, access control, and arithmetic bugs.<sup>[5](#fn-5)</sup> It's the same kind of ground truth the MSR 2026 study was built on, and it's free to run today.

The basic version of the benchmark: pick a handful of contracts with known, tagged vulnerabilities, run your current CI tool and one candidate alternative against each, and record three numbers per contract: true positives found, false positives raised, and wall-clock time.

```bash
git clone https://github.com/smartbugs/smartbugs-curated.git
cd smartbugs-curated/dataset/reentrancy

# tool currently in CI
time slither reentrancy_dao.sol --print human-summary

# candidate alternative
time myth analyze reentrancy_dao.sol
```

Diff the findings against the dataset's own vulnerability labels for that file, not against each other. A tool that agrees with itself isn't the same as a tool that agrees with ground truth. Repeat across 10-15 contracts spanning the vulnerability classes you actually care about, and you have a real F1 and false-positive estimate for your specific tool, not a borrowed number from a paper covering six different tools.

One caveat worth stating up front: SmartBugs Curated's contracts mostly target Solidity 0.4.x and 0.5.x.<sup>[5](#fn-5)</sup> Treat it as a methodology template rather than a drop-in test suite if your codebase is 0.8.x. Run the same procedure against a handful of your own historical contracts with known, documented bugs alongside the public dataset. The runtime number matters as much as the accuracy number: a tool that takes 700 seconds per contract cannot gate a pull request the way a 5-second tool can, regardless of which one finds more bugs.

## Where this fits the rest of your pipeline

Static analysis, however well-benchmarked, only ever reasons about source code. It cannot tell you what a contract actually did once deployed, against real calldata, real callers, and real market conditions. That's a structural limit, not a tooling gap any analyzer will close.

Once your scanner choice is deliberate and measured instead of inherited, the next place unmeasured trust creeps back in is the assumption that your contract behaves in production the way it behaved against the analyzer. For teams running private deployments, L2s, or L3s without a public Etherscan-equivalent, that gap shows up as no visibility into the actual execution trace behind a transaction that didn't match expectations. [We've covered what a trace-level view adds once static analysis has done its job.](/blog/transaction-tracing-with-ethernal) The two layers answer different questions: one tells you what the code could do, the other tells you what it did.

## The thing everyone assumed was already measured

The industry treated reentrancy, self-destruct misuse, and integer errors as solved problems years ago, and in a narrow sense they are: the detection techniques exist and work. What never happened is a standard practice of checking whether the specific tool your CI pipeline runs implements those techniques as well as the alternatives sitting one `npm install` away. A 31.2% to 94.6% F1 spread on the easy categories means some teams are shipping with a tool at the bottom of that range and have no way to know it.

Benchmark the scanner you already trust. It takes less time than the audit that comes after it misses something.

---

## References

<span id="fn-1">1.</span> Abdelaziz, T., Alsaghir, S., Ali, K. "Where Do Smart Contract Security Analyzers Fall Short?" MSR 2026 (23rd International Conference on Mining Software Repositories), 2026. [https://arxiv.org/abs/2603.00890](https://arxiv.org/abs/2603.00890)

<span id="fn-2">2.</span> OWASP Foundation. "Smart Contract Top 10." _owasp.org_. [https://owasp.org/www-project-smart-contract-top-10/](https://owasp.org/www-project-smart-contract-top-10/)

<span id="fn-3">3.</span> Trail of Bits. "Building Secure Contracts." _secure-contracts.com / GitHub: crytic/building-secure-contracts_. [https://github.com/crytic/building-secure-contracts](https://github.com/crytic/building-secure-contracts)

<span id="fn-4">4.</span> Abdelaziz, T. "Smart Contract Security Beyond Detection." _arXiv_, 2026. [https://arxiv.org/abs/2605.09124](https://arxiv.org/abs/2605.09124)

<span id="fn-5">5.</span> di Angelo, M., Durieux, T., Ferreira, J. F., Salzer, G. "SmartBugs: An Execution Framework for Weakness Detection in Ethereum Smart Contracts." Built on the dataset introduced in Durieux, T., Ferreira, J. F., Abreu, R., Cruz, P. "Empirical Review of Automated Analysis Tools on 47,587 Ethereum Smart Contracts," ICSE 2020. Dataset: [https://github.com/smartbugs/smartbugs-curated](https://github.com/smartbugs/smartbugs-curated)
