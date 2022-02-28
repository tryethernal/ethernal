# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.5.0] - 2022-02-28
### Changed
- README updated

### Added
- It's now possible to make your workspace public and accessible through an url like http://wagmi.tryethernal.com, turning it into a public explorer, it can't be activated through the interface yet, but if you are interested in setting this up for you, reach out to Antoine | Ethernal on the Discord server or by email.

## [1.4.2] - 2022-02-23
### Removed
- Accounts are not fetched anymore on workspace creation. This was preventing from connecting to chain without the eth_accounts endpoint

## [1.4.1] - 2022-02-22
### Changed
- Onboarding text when there are issues connecting on remote servers

## [1.4.0] - 2022-02-22
### Changed
- Pagination for blocks & transactions is now done server side

## [1.3.6] - 2022-02-15
### Fixed
- Function calls from proxied contracts are now properly decoded in tracing steps

## [1.3.5] - 2022-02-14
### Fixed
- All parameters were displayed in all inputs on the contract interaction page

## [1.3.4] - 2022-02-14
### Changed
- Better tuples handling on the contract interaction page, they can be entered like this `(param1,param2)`, function signatures on this page are also more precise and will display names when applicable
- Happy Valentine's day (even to those spending it releasing updates & bug fixes) 💝

## [1.3.3] - 2022-02-05
### Changed
- Wording on onboarding modal, to make the process clearer, especially around logging in client side.
- Moving around external links (doc, Discord)

### Added
- Feedback box on the top, maybe this'll work better than Product Road?

## [1.3.2] - 2022-02-03
### Fixed
- RPC server & chain were not displayed properly
- Small race condition where button loading would change state before request is finished
- Not all chains were properly on workspace creation

### Removed
- Obsolete frontend Stripe library

## [1.3.1] - 2022-02-01
### Added
- Avalanche support: contracts metadata can be imported from Snowtrace & the currency is set to Avax when selecting the chain

### Changed
- Technical refactor around multiple chain (only one source of available chains in the frontend now)

## [1.3.0] - 2022-01-31
### Removed
- Trial period: it made sense to have a trial when the transaction tracing feature was only included in the Premium plan, but now that it is available in the free plan as well, it doesn't anymore. The only difference between free/premium is now the 10 contracts/1 workspace limitation. And it doesn't make sense to have a trial for that (the free plan IS the trial already).

### Added
- Custom pricing column in the Billing section

### Changed
- Only include relevant info in the plan explanation in Billing section

## [1.2.10] - 2022-01-30
### Added
- Method name in transactions lists. Hovering it will display a tooltip with the decoded arguments. Updating the ABI updates this in real time. If the method name is not available, the function signature will be displayed instead.

## [1.2.9] - 2022-01-14
### Added
- Link to Product Road board to collect feature requests, you can ask for (almost) anything & I'll build it!!

## [1.2.8] - 2022-01-11
### Added
- It's now possible to edit a workspace server url

## [1.2.7] - 2022-01-07
### Added
- Mixpanel tracking for workspace creation (for better onboarding analytics)

### Fixed
- An analytics helper function wasn't working properly

### Changed
- Wording on the onboarding modal (clearer for Hardhat users)

## [1.2.6] - 2022-01-06
### Changed
- Artifacts stored in rtdb (ast) are deleted after 1 week of not being updated, for free users only. It's only useful for reading storage, and takes up a lot of space, increasing the bill.

## [1.2.5] - 2021-12-24
### Fixed
- Error handling when some write methods are failing
- Merry Christmas 🎅!

## [1.2.4] - 2021-12-21
### Changed
- Prevents from restarting Stripe subscription portal while the subscription webhook is still being processed, better messaging too.

### Removed
- RPC requests sent from the server. All is sent from the browser now. Might need some remote chains to be configured to accept app.tryethernal.com as a domain name but sending requests from Firebase Functions was really buggy

## [1.2.3] - 2021-12-21
### Fixed
- Bumped ethers.js to 5.5.0, fixing bug happening when a Solidity function has the same name than a javascript function (???? see https://github.com/ethers-io/ethers.js/issues/1432)

## [1.2.2] - 2021-12-20
### Added
- Data URI for application/json is parsed and formatted when returned by methods

## [1.2.1] - 2021-12-20
### Added
- Backend tracking to Mixpanel: an event is sent when the following actions happen: block sync, trace sync, artifact sync, contract imported, contract removed, signup, plan change. No blockchain data is sent, only user id, current plan, stripe subscription status, trial date.

### Changed
- Values emitted by events and returned by methods are now automatically parsed and formatted depending on their type. It's possible to switch between parsed/raw data

### Fixed
- Wording related to transaction tracing

## [1.2.0] - 2021-12-14
### Added
- Token balances changes on transaction page (between previous/current block)
- Token transfers on transaction page (based on Transfer event)
- Contracts are automatically tagged with "erc20" and "proxy" tags in the "Contracts" page
- New tokens pages that lists all ERC20 tokens
- On an address page that is a token, there is a new tab that shows the token balance in the latest block for all tracked addresses (addresses in the "Accounts" page)
- On transaction page, uint256 values are easily convertible to int by clicking on the button next to it

### Changed
- Transaction tracing is now included in the free plan
- Contract matching with local or mainnet is done asynchronously. A process in the frontend is monitoring new contracts on Firebase and triggers the matching process (this is done in the frontend so requests can be sent to the chain)
- Contract names are now displayed instead of addresses when applicable
- Function calls and events are now properly decoded with proxy contracts

### Fixed
- Properly set email in Logrocket analytics for premium accounts

## [1.1.4] - 2021-11-18
### Added
- Possibility to import unverified contracts

### Removed
- Open source banner

## [1.1.3] - 2021-10-28
### Changed
- Analytics are only loaded if ENABLE_ANALYTICS env variable is present
- Logrocket id is an env variable
- Logrocket users are tagged with their plan

## [1.1.2] - 2021-10-27
### Fixed
- Loader for contract deletion modal
- Unlocked accounts were showing up twice

### Changed
- Wording for transaction tracing section in transaction page, for free users

## [1.1.1] - 2021-10-26
### Fixed
- Wording for import contract modal (now depends on the chain setting)

## [1.1.0] - 2021-10-26
### Added
- Better support for BSC & Matic: native currencies, contract import, contract matching for tracing
- Technical improvement in how workspaces are created

### Fixed
- Handling of array of addresses for contract methods
- Handling of method responses that are not arrays

## [1.0.1] - 2021-10-25
### Fixed
- Handling of array parameters for contract methods
- Error message was not properly handled and not displayed in some scenario when interacting with contract methods (when gas limit was wrong for example)

## [1.0.0] - 2021-10-18
### Changed
- Ethernal is now open source 🥳 (see [https://blog.tryethernal.com/ethernal-is-going-open-source/](https://blog.tryethernal.com/ethernal-is-going-open-source/))
- Contracts list is now ordered by deploy time, which is displayed
- All writes action are now done on the backend, firestore/rtdb rules are now forbidding any direct write

### Added
- Premium plan 🤑
- Possiblity to remove contracts
- BSL license for Ethernal

### Fixed
- Github Action for backend tests (it wasn't running)

## [0.3.3] - 2021-10-18
### Fixed
- Solidity 'pure' functions are now properly showing under "Read Methods" in the contract's UI page.

## [0.3.2] - 2021-10-16
### Fixed
- Error handling on write functions

## [0.3.1] - 2021-09-16
### Fixed
- Ethernal now decodes & displays custom Solidity exceptions when thrown

### Added
- Unit tests that were missing for a frontend library

## [0.3.0] - 2021-09-03
### Changed
- Events emitted by contracts called internally in a transaction are now properly decoded
- Transaction tracing now handles proxy contracts

## [0.2.1] - 2021-07-31
### Fixed
- UI bug with the display of Alchemy integration enabled/disabled status.

### Added
- Storage API, see: https://doc.tryethernal.com/integrations/api.
- Copy to clipboard shortcut on hashes & addresses.

## [0.2.0] - 2021-07-29
### Changed
- Various internals (moved some stuff from frontend to backend).
- All account addresses are lowercased.

### Added
- Unit tests for all Vue components, frontend libraries, backend libraries and cloud functions.

### Fixed
- Addresses should all be lowercased now.
- When a write tx fails, the receipt will stop loading and it will show on the UI.
- When selecting a tx for the first time on the storage page, storage is automatically displayed after being decoded.

## [0.1.3] - 2021-06-27
### Changed
- Etherscan contract import is now done server side.
- Some actions are now done server side: workspace creation/switching, balance syncing and settings update.
- Code factorization between workspace creation in onboarding modal/workspace creation modal.
- Some components have been refactored for easier integration: event/functions display, transaction picker.
- All UI components are now unit tested!
- Github Actions workflow has been changed to do the following: test on all push/pr, deploy saas & sh on a new tag on master only if test pass.

### Fixed
- Function signature generation when syncing transaction.
- Some server side error logging.
- ABI import from a file.

## [0.1.2] - 2021-06-02
### Changed
- Allow contract dependencies to be updated one by one (if all are updated at once, we are more likely to hit the 10mb payload limit from Firebase).

## [0.1.1] - 2021-05-21
### Added
- Changelog file that will be updated at each release.

### Changed
- Firebase variables need to be set manually in app.js.
