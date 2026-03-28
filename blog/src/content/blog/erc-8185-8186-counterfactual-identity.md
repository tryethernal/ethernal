---
title: "The Address That Existed Before the Contract: ERC-8185 and ERC-8186"
description: "ERC-8185 and ERC-8186 create deterministic on-chain addresses for GitHub repos, domains, and npm packages, before their owners have ever touched Ethereum."
date: 2026-03-28
tags:
  - ERC-8185
  - ERC-8186
  - Smart Contracts
  - Identity
  - Open Source
image: "/blog/images/erc-8185-8186-counterfactual-identity.png"
ogImage: "/blog/images/erc-8185-8186-counterfactual-identity-og.png"
status: draft
readingTime: 8
---

An AI agent allocating grant funds sends 2 ETH to the `github:protocolkit/optics` identifier. The GitHub repo has never deployed a contract. No Ethereum address was registered anywhere. Yet the ETH lands at a specific address, deterministically derived and unique to that identifier. Eighteen months later, the maintainer claims it with one transaction. The balance transfers. This is not a wallet trick. It is a new protocol primitive: addresses that exist before anyone materialises them.

ERC-8185 (Off-Chain Entity Registry)<sup>[1](#fn-1)</sup> and ERC-8186 (Identity Account),<sup>[2](#fn-2)</sup> both published as drafts in March 2026 by Carl Barrdahl, are the two-layer stack that makes this possible. ERC-8185 creates a shared resolution layer for off-chain entities. ERC-8186 extends it with counterfactual accounts that can receive funds before any contract is deployed.

## The gap ENS and EAS leave open

ENS resolves human names to Ethereum addresses. EAS creates signed attestations about claims. Neither answers the question: what is the canonical Ethereum address for `github:org/repo`?

Today, protocols like Drips and Gitcoin each build bespoke resolution logic. There is no shared primitive. The consequence is that open-source funding requires maintainers to pre-register, which filters out exactly the projects not yet engaged with Ethereum. AI agents that want to fund dependencies programmatically depend on centralized APIs to resolve repository identities. DAOs that want to pay a DNS-named organization have no permissionless path.

The Ethereum Magicians discussion thread for ERC-8185 puts it plainly: "Ethereum has ENS for people. What about everything else?"<sup>[3](#fn-3)</sup> ERC-8185 is the proposed answer.

## ERC-8185: namespaced identifiers with pluggable verification

ERC-8185 maps `(namespace, canonicalString)` pairs to `bytes32` identifiers, and from there to owner addresses.

The identifier formula:

```solidity
bytes32 id = keccak256(abi.encode(namespace, canonicalString));
// keccak256(abi.encode("github", "protocolkit/optics"))
// keccak256(abi.encode("dns", "letsencrypt.org"))
// keccak256(abi.encode("npm", "express"))
```

The spec uses `abi.encode` rather than `abi.encodePacked`. The reason is concrete: `abi.encodePacked` would make `keccak256("githu" + "borg/repo")` collide with `keccak256("github" + "org/repo")`. Typed encoding prevents this class of namespace collision attacks.

The registry interface is minimal:

```solidity
interface IOffChainEntityRegistry {
    function toId(string calldata namespace, string calldata canonicalString) external pure returns (bytes32);
    function ownerOf(bytes32 id) external view returns (address);
    function claim(string calldata namespace, string calldata canonicalString, bytes calldata proof) external;
    function revoke(string calldata namespace, string calldata canonicalString) external;
    function linkIds(bytes32 primaryId, bytes32[] calldata aliasIds) external;
    function setVerifier(string calldata namespace, address verifier) external;
}
```

Verification is pluggable per namespace via a separate `IVerifier` contract. The reference implementation uses an oracle model: an off-chain service issues EIP-712 signed proofs with a TTL, confirming a given address controls the entity. The registry checks the proof against the registered verifier for the namespace.

The upgrade path is the interesting design choice here. The registry itself does not change when verification technology improves. Swap in a zkTLS or DNSSEC verifier for the `dns` namespace and all future DNS claims use the stronger proof system. Existing claims are unaffected unless the owner revokes and re-claims. That separation of concerns is what makes ERC-8185 genuinely extensible rather than just claiming to be.

Aliases (`linkIds`) are single-level only. Primary ID resolves to owner directly; alias IDs resolve to primary, then to owner. No unbounded traversal. `ownerOf` stays O(1) regardless of how many aliases are linked.

What the registry deliberately omits: normalization (off-chain, verifier-enforced), challenge mechanisms for stale claims (deferred to a future ERC), and fees.

## ERC-8186: the counterfactual account

ERC-8185 solves identity resolution after a claim. ERC-8186 solves the funding problem before a claim ever happens.

The mechanism is CREATE2 determinism. A factory contract derives an account address from the `bytes32` identifier as the salt:

```
address = keccak256(0xff ++ factoryAddress ++ id ++ keccak256(initcode))[12:]
```

Before anyone deploys the proxy, the address is already computable. ETH and ERC-20 tokens sent to that address accumulate there, standard EVM behavior for accounts with no code yet.

The two core interfaces:

```solidity
interface IAccountFactory {
    event AccountDeployed(bytes32 indexed id, address account);
    function predictAddress(bytes32 id) external view returns (address);
    function deployAccount(bytes32 id) external returns (address account);
}

interface IIdentityAccount {
    function execute(address target, bytes calldata data, uint256 value) external returns (bytes memory);
}
```

`deployAccount` is permissionless. Anyone can materialise the proxy. This does not grant access to funds; deploying the proxy only creates the contract shell. `execute` is owner-only: at runtime it calls `registry.ownerOf(id)` and reverts unless `msg.sender` is the current registered owner.

In practice:

```solidity
// Compute address before deployment (and before any claim)
bytes32 id = registry.toId("github", "protocolkit/optics");
address account = factory.predictAddress(id);

// Send funds; proxy not yet deployed, funds accumulate at predicted address
token.transfer(account, 2 ether);

// Anyone deploys the proxy (permissionless)
factory.deployAccount(id);

// After claim, owner executes freely
IIdentityAccount(account).execute(
    swapRouter,
    abi.encodeCall(ISwapRouter.exactInputSingle, (params)),
    0
);
```

The implementation uses a beacon proxy. Upgrading the beacon implementation changes all deployed accounts simultaneously without changing any address. ERC-8186's reference implementation is four contracts with no external dependencies.<sup>[4](#fn-4)</sup>

### Why not ERC-6551?

ERC-6551 (Token Bound Accounts) solves a structurally similar problem for NFTs. The authors considered it and rejected it on three grounds. Ownership in ERC-8186 is non-transferable and revocable, which does not fit NFT semantics. ERC-6551 binds accounts to a fixed implementation at creation; beacon upgradeability requires a different pattern. And ERC-6551 mandates a heavier interface (`token()`, `state()`, `isValidSigner()`, DELEGATECALL support). ERC-8186 needs only `execute` with a standard CALL.

## Account lifecycle: five states

The full lifecycle from pre-deployment to reclaim:

| State | Condition | `execute` | Funds |
|-------|-----------|-----------|-------|
| Pre-deployment | Proxy not deployed | N/A | Accumulate at predicted address |
| Deployed, unclaimed | Proxy deployed, no registry owner | Reverts | Held in proxy |
| Claimed | Owner registered via `claim()` | Owner only | Accessible |
| Post-revocation | Owner revoked, no new claim | Reverts | Held until next claim |
| Reclaimed | New owner registers | New owner only | Accessible again |

One design consequence worth flagging: funds flow to the *current* owner on reclaim. Entities should withdraw balances before revoking to avoid handing accumulated funds to a successor.

## What this enables

The immediate applications are real, not hypothetical.

Grant protocols can send funds to repository identifiers directly, without requiring maintainers to pre-register. A protocol allocating grants to the top 100 npm packages by download count can do so in a single batch, regardless of whether any of those maintainers have Ethereum addresses. Maintainers claim when they choose.

An AI agent with an on-chain budget can fund `npm:lodash`, `github:expressjs/express`, and `dns:letsencrypt.org` autonomously: no centralized API lookup, no manual address resolution. The agent derives identifiers from the package manifest and sends funds directly. That is a qualitatively different kind of automated public goods funding than anything the current ecosystem supports.

DAOs can pass proposals to fund DNS-named organizations. The organizations do not need to know the DAO exists in advance. Funds accumulate. They claim on their own timeline.

All three scenarios get better as the oracle verifier is replaced by zkTLS or DNSSEC verifiers. The registry contract stays unchanged; only the proof mechanism improves.

## Watching the lifecycle on-chain

The registry and factory emit a complete audit trail. The registry emits `Claimed`, `Revoked`, and `LinkAdded`. The factory emits `AccountDeployed(bytes32 indexed id, address account)`, searchable by identifier hash.

The most information-dense point in the lifecycle is the first `execute` call after a claim. That transaction trace reveals exactly what the new owner did with accumulated funds: a full call graph including internal calls, reverts, and subcall results.

A concrete debugging scenario: an owner calls `execute` immediately after claiming and gets a revert. The possible causes are distinct. The `claim` transaction is not yet finalized. The registry verifier rejected the proof. The owner address is not what the owner expected. Call tracing shows the exact internal call that failed, whether it was the `ownerOf` check inside `execute`, the verifier inside `claim`, or something in the forwarded call. Without a full call trace view, distinguishing these requires guesswork. Ethernal's decoded event stream and call trace view are the natural monitoring surface for this kind of multi-step, state-dependent lifecycle.

## Open questions

ERC-8185 and ERC-8186 are fresh drafts as of March 2026. Several issues remain unresolved, and a few of them are genuinely thorny.

The most significant gap is the absence of a stale claim challenge mechanism. If a GitHub repository changes hands or a domain name expires, the on-chain registry has no way to reflect that without the current claimant voluntarily revoking. This is deferred to a future ERC by design, but it is a real operational risk for any protocol relying on long-term entity resolution.

Oracle key compromise is a single point of failure until zkTLS verifiers ship. The reference implementation recommends HSM storage and rotation for oracle operators, but the trust model is centralized for now. Using ERC-8185-gated funds under the assumption of decentralized security would be premature.

The reentrancy guard on `execute` is actively debated: REQUIRED versus RECOMMENDED. The spec currently says RECOMMENDED. Given that `execute` forwards arbitrary calls, a missing reentrancy guard on a widely deployed implementation is a non-trivial attack surface. That debate should be settled before production deployment.

Namespace governance is unspecified. The spec recommends curated approval to prevent squatting but provides no on-chain mechanism. How namespaces are approved in practice will significantly affect the registry's usefulness.

Both ERCs depend on each other to be useful. Adoption depends on the pair landing together.

---

## References

<span id="fn-1">1.</span> Barrdahl, C. (@carlbarrdahl). "ERC-8185: Off-Chain Entity Registry." _GitHub ERCs_, March 4, 2026. [https://github.com/ethereum/ERCs/pull/1580](https://github.com/ethereum/ERCs/pull/1580)

<span id="fn-2">2.</span> Barrdahl, C. (@carlbarrdahl). "ERC-8186: Identity Account." _GitHub ERCs_, March 5, 2026. [https://github.com/ethereum/ERCs/pull/1582](https://github.com/ethereum/ERCs/pull/1582)

<span id="fn-3">3.</span> Ethereum Magicians. "ERC-8185: Off-Chain Entity Registry, Discussion." _ethereum-magicians.org_, March 4, 2026. [https://ethereum-magicians.org/t/erc-8185-off-chain-entity-registry/27899](https://ethereum-magicians.org/t/erc-8185-off-chain-entity-registry/27899)

<span id="fn-4">4.</span> Barrdahl, C. "ethereum-canonical-registry: Reference Implementation." _GitHub_, 2026. [https://github.com/carlbarrdahl/ethereum-canonical-registry](https://github.com/carlbarrdahl/ethereum-canonical-registry)
