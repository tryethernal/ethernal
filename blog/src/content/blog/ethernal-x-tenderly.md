---
title: "Ethernal x Tenderly"
date: 2022-02-11
description: "Set up a block explorer for your Tenderly forks. Debug transactions sent through Ethernal's UI directly in Tenderly."
image: "/blog/images/ethernal-x-tenderly.png"
ogImage: "/blog/images/ethernal-x-tenderly-og.png"
tags:
  - Ethernal
  - Developer Tools
status: published
readingTime: 2
---

*This feature is only available to Tenderly Pro users.*

[Tenderly](https://tenderly.co/) is one of the most widely used tools for smart contracts development. It lets you inspect transactions to debug the stack trace or have a break down of gas consumption per function for example.

In this article, we'll focus on their fork feature, which allows you to spin up a mainnet fork on demand, either through the UI or via an API.

By connecting this fork to Ethernal, you'll set up an explorer for all blocks & transactions going through it, and you'll be able to debug in Tenderly all transactions sent by Ethernal's generated UI for contracts.

### Setting up the workspace

Start by creating an account on [app.tryethernal.com](https://app.tryethernal.com/) or a new workspace in the settings page.

Connect the new workspace to your Tenderly RPC endpoint.

### Start the CLI

Now that the workspace is set up, you need to start the CLI in order to listen to transactions going through it. If all goes well, you'll see the latest fork block getting synchronized.

### Use Ethernal

Now all transactions going through this RPC endpoint will be synchronized with Ethernal.

That also means that all transactions that you are going to send by interacting with Ethernal are going to be synchronized with Tenderly, giving you more flexibility on how you want to test & debug your contracts.

This is particularly useful if you are working with imported mainnet contracts as this will let you easily debug those transactions in Tenderly.

Here is an example where we import the UniswapPair factory contract, create a new pair on the fork and then debug the transaction. This is all done with a few clicks, without having to script anything, saving you time to focus on building your contracts.

*Ethernal is an open-source block explorer for EVM-based chains. It is compatible with remote and local chains. It integrates with Hardhat, Truffle and Brownie. If you haven't yet, you can sign up [here](https://app.tryethernal.com/).*
