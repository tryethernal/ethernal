---
title: "Ethernal x Alchemy"
date: 2021-04-29
description: "Add a webhook in your Alchemy dashboard and get a block explorer for your dapp. Automatic transaction syncing and decoded function calls."
image: "/blog/images/ethernal-x-alchemy.png"
tags:
  - Ethernal
  - Developer Tools
status: published
readingTime: 3
---

### What is Alchemy?

If you are here, you probably already are familiar with [Alchemy](https://www.alchemy.com/), but just in case:

Alchemy is a gateway to different Ethereum public networks (Mainnet, Kovan, ...), but unlike others, it also provides development tools on top of that. You can, for example, explore & replay raw transactions that you sent through their node, making it very useful for debugging decentralized apps.

### How does Ethernal integrate with it?

One interesting feature that Alchemy provides is triggering a webhook every time a transaction going through their RPC endpoint is mined.

So we built an endpoint that can receive those webhooks, fetch the corresponding block & transaction on the network, and combine it with your contract's metadata, turning all of this in a dashboard that can give you a complete, and easy to read view of what's going on with your dapp.

Here are a few examples of what you get after integrating the webhook:

- Dapp transactions are automatically synced with your dashboard
- Function calls and events are automatically decoded
- You can decode the value of any variable in your contract

You can get a similar result by running the Ethernal CLI, and synchronizing each block coming in. However, this means having the CLI constantly running, which is not very practical.

On top of that, you would synchronize *every* transaction of the network, overloading your dashboard with useless data.

### How to set it up?

You can set up this integration in any workspace, but, to avoid mixing your data, we recommend that you create another one. A good practice is to have one workspace per Alchemy endpoint.

Get your Alchemy endpoint in your dashboard, and create a new workspace with it on Ethernal ("Settings" > "Create Workspace").

Once this is done, in the "Integrations" panel, click on "Manage" next to "Alchemy API". Toggle the switch in the modal window, and your webhook endpoint will appear.

Now, for the last step of the setup, go back to the [Notify section](https://dashboard.alchemyapi.io/notify) of your Alchemy dashboard. (The link is in the top navigation bar).

Scroll down to "Mined Transaction Notifications", click on "Create Webhook", select the app, paste the webhook in the field, confirm, and you are done!

Now all your dapp transactions will appear on your Ethernal dashboard, a few seconds after they have been mined.

One last thing to note: as mentioned above, running your CLI on this workspace would synchronize every block of the network. If you want to only synchronize contract metadata, run the CLI with the `-l` option: `ethernal listen -d ~/solidity/token -l`

If you run into any issues, feel free to send an email to antoine@tryethernal.com, or to ask me (@antoinedc) on the [Discord server](https://discord.gg/jEAprf45jj).

We'll also happily take integration requests if you know of other Ethereum gateways that provide similar webhooks!

Doc: [Alchemy API Integration](https://doc.tryethernal.com/integrations/alchemy-api)

*Ethernal is a block explorer for EVM-based chains. It is compatible with remote and local chains. It integrates with Hardhat, Truffle and Alchemy. If you haven't yet, you can sign up [here](https://app.tryethernal.com/).*
