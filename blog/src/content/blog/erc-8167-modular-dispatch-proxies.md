---
title: "The Two Functions That Make a Modular Proxy Legible: ERC-8167"
description: "ERC-8167 standardizes how block explorers and tools discover which delegate handles which function on a modular dispatch proxy, in two functions."
date: 2026-10-13
tags:
  - ERC-8167
  - Proxy Contracts
  - Smart Contracts
  - Standards
keywords: []
image: "/blog/images/erc-8167-modular-dispatch-proxies.png"
ogImage: "/blog/images/erc-8167-modular-dispatch-proxies-og.png"
status: published
readingTime: 7
---

An engineer pastes a Diamond-pattern contract address into a standard block explorer and gets back an ABI that's either empty or only shows the diamond's own admin functions: `diamondCut`, `facets`, `facetAddress`. None of the actual logic the contract exposes to users shows up, because that logic lives in facet contracts the explorer has no way to discover. The fix, historically, has been a bespoke third-party tool: Louper.dev, "the Ethereum Diamond Inspector," exists specifically because standard explorers can't read the Diamond Standard's introspection interface.<sup>[1](#fn-1)</sup> ERC-2535, the standard behind Diamonds, is from 2020.<sup>[2](#fn-2)</sup> Six years later, a much smaller standard just reached Final status with a direct answer: two functions instead of four, and no diamond-specific jargon.

## What a dispatch proxy actually is

A dispatch proxy is a contract that routes each incoming call to one of several logic contracts, called delegates, based on the call's 4-byte function selector, using `delegatecall`. That's different from the single-implementation-pointer proxies most tooling is built around (EIP-1967, EIP-1822), where every call goes to the same address. A dispatch proxy can send `transfer(address,uint256)` to one delegate and `mint(address,uint256)` to a completely different one.

The motivation, per ERC-8167's own spec,<sup>[3](#fn-3)</sup> covers several real use cases. Two token contracts can share common balance and transfer logic while customizing only what differs, like metadata or monetary policy, without duplicating the whole implementation. New interfaces can be added as new modules without touching existing logic. A monolithic upgradeable proxy has to replace its entire implementation on every upgrade; a dispatch proxy can swap the delegate for a single selector, producing a smaller, more reviewable changeset. Splitting logic across delegates also works around the 24KB contract size limit. And an upgradeable dispatch proxy can later be hardened into something permanently immutable, by uninstalling just its upgrade functions and leaving everything else in place.

The spec explicitly calls out EIP-7702, which lets externally owned accounts delegate their code, as a natural fit: a smart account could install selector-scoped features one at a time without disabling unrelated account functionality.<sup>[3](#fn-3)</sup> As EOA-delegated smart accounts become more common, that's a use case that gets more relevant, not less.

## ERC-8167's interface

ERC-8167 (Modular Dispatch Proxies), authored by William Morriss and Radek Svarz, reached Final status on the Ethereum ERCs repository after being proposed in February 2026.<sup>[3](#fn-3)</sup> The full interface is small enough to read in one pass:

```solidity
pragma solidity ^0.8.4;
interface IERC8167 {
    // RECOMMENDED
    // Emitted when assigning a delegate logic module to a selector
    // An address(0) delegate signals removal
    event SelectorDelegated(bytes4 indexed selector, address indexed delegate);

    // REQUIRED
    // Returns the delegate for the selector, using address(0) for function not found
    function implementation(bytes4 selector) external view returns (address);

    // REQUIRED
    // Surfaces the ABI
    // SHOULD return all function selectors with implementations
    function selectors() external view returns (bytes4[] memory);

    // RECOMMENDED
    // If the delegate for that selector is not set, the proxy SHOULD revert, and with FunctionNotFound.
    error FunctionNotFound(bytes4 selector);
}
```

Only two functions are REQUIRED: `implementation(bytes4)`, which maps a selector to the delegate that handles it, and `selectors()`, which returns the full set of selectors currently installed. The event and the custom error are RECOMMENDED, not REQUIRED, which matters for interoperability (more on that below).

`selectors()` exists for a specific, stated reason: without it, a tool trying to figure out what a proxy can do would have to replay every `SelectorDelegated` event ever emitted, which is slow without an indexed database behind it. One view call instead of a log scan.

## The ABI-reconstruction algorithm

This is the part of the spec that reads like a tutorial for anyone building tooling, including a block explorer. The Rationale section lays out, step by step, how a tool reconstructs a dispatch proxy's complete ABI:<sup>[3](#fn-3)</sup>

1. Call `selectors()` to get every installed function selector.
2. For each selector, call `implementation(selector)` to find which delegate handles it.
3. For each unique delegate address returned, check whether its code is verified. If it is, pull its ABI. If it isn't, prompt the user to supply the missing ABI. Match each selector against its delegate's ABI to assemble the proxy's complete callable interface.

That's the exact logic a block explorer needs to implement to support ERC-8167 proxies natively: enumerate selectors, resolve each one to a delegate, group by delegate, pull or request ABIs, merge. No facets, no loupe, no diamond-specific vocabulary to learn first.

## How this compares to the Diamond Standard it responds to

ERC-8167's spec frames itself explicitly as a simplification of ERC-2535's Diamond Loupe interface. For comparison, here's what `IDiamondLoupe` requires:<sup>[2](#fn-2)</sup>

| Function | Returns | Purpose |
|---|---|---|
| `facets()` | `Facet[]` (address + selectors) | All facets and their selectors |
| `facetFunctionSelectors(address)` | `bytes4[]` | Selectors for one facet |
| `facetAddresses()` | `address[]` | All facet addresses |
| `facetAddress(bytes4)` | `address` | Facet for one selector |

Four required functions, with an interface ID computed as the XOR of all four selectors. ERC-8167 covers the same introspection surface with two functions and a simpler selector-to-delegate mapping direction. The spec states its improvements plainly: no diamond-specific jargon ("facets," "loupe," "cuts"), fewer required functions, and a simpler upgrade event.<sup>[3](#fn-3)</sup>

The cost of Diamond's heavier interface shows up in the tooling that exists around it. Louper.dev had to be built as a standalone inspector because mainstream explorers don't read `IDiamondLoupe` natively.<sup>[1](#fn-1)</sup> A separate project, diamond-etherscan, exists purely to make EIP-2535 Diamonds compatible with Etherscan's verification flow.<sup>[4](#fn-4)</sup> Both are evidence of the same underlying problem: a standard that never got broad native explorer support, pushing legibility out to third-party tools instead. ERC-8167's minimal required surface is a direct attempt to not repeat that.

## It wasn't rubber-stamped

The Ethereum Magicians discussion thread for ERC-8167 shows the standard changing shape in response to specific, named feedback, not sailing through unchanged.<sup>[5](#fn-5)</sup>

DanielVF raised a storage-collision concern on the reference implementation: a naive storage layout for the proxy risked colliding with storage slots used by delegates, a known class of `delegatecall` attack vector. The author responded by adopting namespaced storage, in the style of ERC-7201, in the reference implementation. Helkomine asked whether `selectors()` should support pagination, since an unbounded array return risks exceeding RPC response size limits on proxies with a large number of installed functions.

The most consequential change came from co-author Radek Svarz, who argued that requiring `implementation()` and the delegation event as hard REQUIRED fields would exclude existing ERC-2535 and ERC-8153 implementations from ever satisfying ERC-8167, even though they solve the same problem. That argument is why the event and the revert-on-missing-selector behavior were downgraded from REQUIRED to RECOMMENDED in the final spec. It's a deliberate interoperability choice: keep the REQUIRED surface small enough that other dispatch-proxy standards can be retrofitted to comply, rather than forcing a parallel, incompatible interface into existence. The proposal moved from Draft to Review in March 2026 and has since reached Final.<sup>[3](#fn-3)</sup>

The spec is also direct about where the real risk sits. Delegates must never call `selfdestruct`, since doing so breaks every proxy pointing at them. Shared code means shared blast radius. Storage layout collisions between delegates are flagged as the main security consideration, with the recommendation to use either a single shared storage base class across delegates or namespaced storage (ERC-7201, ERC-8042) for delegates meant to be reused as libraries. Upgrade access control is explicitly left out of scope, for implementers to decide.

## Where explorers, including Ethernal, stand today

Ethernal's current proxy resolution is single-pointer, not selector-aware. Contract verification pulls `Proxy`/`Implementation` fields from Etherscan-family APIs,<sup>[6](#fn-6)</sup> and a separate behavioral heuristic flags a contract as a proxy when it responds to ERC-20, ERC-721, or ERC-1155 calls that its own stored ABI doesn't declare.<sup>[7](#fn-7)</sup> The `Contract` model stores exactly one `proxy` address field and a self-referencing implementation association.<sup>[8](#fn-8)</sup> There's no concept anywhere in the schema of multiple delegates, selectors, or per-function resolution, and the UI decodes calls and events using whichever single implementation ABI that pointer resolves to.

That's a real gap against ERC-8167. Point Ethernal, or any single-pointer explorer, at a dispatch proxy today and it either fails to resolve an implementation at all, or at best guesses one. It has no way to show that `transfer` is handled by delegate A while `mint` is handled by delegate B, which is exactly the question ERC-8167 exists to make answerable in two view calls. Supporting it natively would mean implementing the three-step algorithm above: enumerate `selectors()`, resolve each through `implementation()`, group by unique delegate, and merge each delegate's verified ABI into one composite interface for decoding traces and events.

The standard's own bet is that a proxy is only as debuggable as its introspection surface. ERC-2535 made that surface big enough to need third-party tools. ERC-8167 is testing whether two required functions are enough to make it a native feature instead.

## References

<span id="fn-1">1.</span> Louper.dev. "What Is a Diamond? EIP-2535 Explained." _louper.dev_, 2026. [https://louper.dev/learn/what-is-a-diamond](https://louper.dev/learn/what-is-a-diamond)

<span id="fn-2">2.</span> Mudgen, N., et al. "ERC-2535: Diamonds, Multi-Facet Proxy." _Ethereum Improvement Proposals_, 2020. [https://eips.ethereum.org/EIPS/eip-2535](https://eips.ethereum.org/EIPS/eip-2535)

<span id="fn-3">3.</span> Morriss, W. (@wjmelements), Svarz, R. (@radeksvarz). "ERC-8167: Modular Dispatch Proxies." _Ethereum Improvement Proposals_, February 16, 2026. [https://eips.ethereum.org/EIPS/eip-8167](https://eips.ethereum.org/EIPS/eip-8167)

<span id="fn-4">4.</span> Denham, Z. "diamond-etherscan: Make your EIP-2535 Diamond Etherscan compatible." _GitHub_, 2026. [https://github.com/zdenham/diamond-etherscan](https://github.com/zdenham/diamond-etherscan)

<span id="fn-5">5.</span> Ethereum Magicians. "ERC-8167: Modular Dispatch Proxies, Discussion." _ethereum-magicians.org_, 2026. [https://ethereum-magicians.org/t/erc-8167-modular-dispatch-proxies/27781](https://ethereum-magicians.org/t/erc-8167-modular-dispatch-proxies/27781)

<span id="fn-6">6.</span> Ethernal. `run/jobs/processContract.js`, line 174. [https://github.com/tryethernal/ethernal/blob/develop/run/jobs/processContract.js](https://github.com/tryethernal/ethernal/blob/develop/run/jobs/processContract.js)

<span id="fn-7">7.</span> Ethernal. `ContractConnector.isProxy()`, `run/lib/rpc.js`, lines 724-738. [https://github.com/tryethernal/ethernal/blob/develop/run/lib/rpc.js](https://github.com/tryethernal/ethernal/blob/develop/run/lib/rpc.js)

<span id="fn-8">8.</span> Ethernal. `run/models/contract.js`, lines 47-51, 279-288, 589-594. [https://github.com/tryethernal/ethernal/blob/develop/run/models/contract.js](https://github.com/tryethernal/ethernal/blob/develop/run/models/contract.js)
