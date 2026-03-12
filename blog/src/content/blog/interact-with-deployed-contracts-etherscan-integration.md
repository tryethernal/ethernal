---
title: "Interact with Mainnet Contracts on Your Local Fork"
date: 2021-05-03
description: "Import contracts from Etherscan into your Ethernal dashboard to interact with them on your local mainnet fork."
image: "/blog/images/interact-with-deployed-contracts-etherscan-integration.png"
ogImage: "/blog/images/interact-with-deployed-contracts-etherscan-integration-og.png"
tags:
  - Ethernal
  - Developer Tools
status: published
readingTime: 1
---

Forks allow you to easily replicate locally the state of public blockchains at a chosen block.

This means that all contracts deployed on the blockchain are now available for you to use. This is very useful if you are building a dapp on top of existing contracts, as you don't need to worry about downloading their code and redeploying locally. You directly work with production data.

When working with those contracts, you might want to interact directly with them, without having to write a dapp just for that, executing a swap on the Uniswap contract for example.

Now, with Ethernal, you can do that in a few clicks, thanks to the new Etherscan integration, you just need the address of the contract!

Go to the "Contracts" tab, click on "Import Contract", enter the address, and click "Import". This will pull the name and the ABI from Etherscan, and populate your contracts list!

Once this is done, go to the contract page, and from there you'll be able to see the list of transactions sent to this address on your fork, and, on the "Contract" tab, to interact with all the read & write methods!

The only thing you need to check before using this feature, is that the contract is verified on Etherscan. If it isn't, the import will fail as needed info (name & ABI) won't be found.

Doc: [Import Mainnet Contracts](https://doc.tryethernal.com/dashboard-pages/contracts/import-mainnet-contracts)

*Ethernal is a block explorer for EVM-based chains. It is compatible with remote and local chains. It integrates with Hardhat, Truffle and Alchemy. If you haven't yet, you can sign up [here](https://app.tryethernal.com/).*
