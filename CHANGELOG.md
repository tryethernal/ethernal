# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.5.2] - 2023-01-10
### Fixed
- CI

## [3.5.1] - 2023-01-10
### Fixed
- Bug triggering validation error when processing some token transfers

## [3.5.0] - 2023-01-10
### Added
- Added ids to token transfers & balance changes for better data reliability

## [3.4.6] - 2023-01-04
### Fixed
- [Public Explorer] Remove Authorization header when authenticating with Pusher

## [3.4.5] - 2023-01-04
### Fixed
- Re-enable analytics

## [3.4.4] - 2023-01-03
### Fixed
- [Public Explorer] Contract verification was not working if constructor deployed a new contract
- Happy new year 🍾!

## [3.4.3] - 2022-12-30
### Fixed
- Tests

## [3.4.2] - 2022-12-30
### Changed
- Improved CI/CD process to include everything

### Added
- Newrelic monitoring

## [3.4.1] - 2022-12-29
### Fixed
- Frontend auth

## [3.4.0] - 2022-12-27
### Changed
- Frontend auth is now done with the api token instead of firebase id

## [3.3.2] - 2022-12-21
### Fixed
- Bug preventing plans upgrade/downgrade

## [3.3.1] - 2022-12-20
### Changed
- Restrict server side sync to public workspaces (ie public explorer plans).

## [3.3.0] - 2022-12-20
### Added
- Contract logs endpoint

## [3.2.0] - 2022-12-14
### Changed
- Improve frontend id token management

## [3.1.6] - 2022-12-13
### Changed
- Keep Logrocket for frontend monitoring
- Better backend logging (avoid OOM due to circular JSON dependency)
- Fix ERC-721 reloading bugs

## [3.1.5] - 2022-12-13
### Added
- Datadog monitoring (back + front)

## [3.1.4] - 2022-12-07
### Added
- [Public Explorer] ERC-721 autoloading is now configurable

### Fixed
- Fixed ERC-721 infinite autoloading

## [3.1.3] - 2022-12-06
### Changed
- Display transaction gas limit instead of block gas limit
- Better transaction status detection

## [3.1.2] - 2022-12-05
### Changed
- Transaction status now handles cases with no status field

## [3.1.1] - 2022-12-04
### Fixed
- API for contract storage
- Contract storage loading

## [3.1.0] - 2022-12-04
### Changed
- [Public Explorer] Make storage tab activable

## [3.0.2] - 2022-12-03
### Changed
- [Public Explorer] Better banner display

## [3.0.1] - 2022-12-03
### Changed
- [Public Explorer] Better custom logo display
- Postgres connection config in dev mode

## [3.0.0] - 2022-11-30
### Added
- Docker files + docker compose

### Changed
- Apps is now hosted on [Fly.io](https://fly.io) instaed of GCP

### Removed
- All Google Cloud dependencies except Firebase Auth & Cloud Logging (optional)

## [2.14.1] - 2022-11-23
### Fixed
- Bug that caused read method calls to be called on the Metamask network when calling with loaded accounts

## [2.14.0] - 2022-11-22
### Fixed
- Bug that prevented contract call if the explorer is public and Metamask is not installed

### Added
- Shortcut to add network to Metamask

## [2.13.0] - 2022-11-15
### Added
- Bytecode & Assembly version are now displayed on contracts pages under the "Code" tab

### Fixed
- Bug preventing from reading storage

## [2.12.1] - 2022-11-14
### Added
- On subscription, add email to Ghost blog (if env variable is set)
- User processing task

### Changed
- Backend user analytics setup is done on the new user processing background task

## [2.12.0] - 2022-11-04
### Changed
- AST is now uploaded to Postgres. Make sure to update the CLI to 2.0.0 and the Hardhat plugin to 3.0.0 so that variable reading keeps working.

## [2.11.4] - 2022-11-01
### Fixed
- Infinite loading for call options if no ABI uploaded

## [2.11.3] - 2022-10-24
### Fixed
- Bug preventing call options to be changed

## [2.11.2] - 2022-10-24
### Fixed
- Fixed bug that prevented proxied erc20 contracts from being correctly processed

## [2.11.1] - 2022-10-23
### Fixed
- Fixed bug that prevented new blocks from being detected during onboarding

## [2.11.0] - 2022-10-22
### Added
- Arbiscan support for contract import (you can update your chain in the "Settings" tab)

## [2.10.1] - 2022-10-19
### Fixed
- [Public Explorer] Overview stats display bug

## [2.10.0] - 2022-10-18
### Added
- [Public Explorer] Possibility to interact with contracts using loaded accounts
- Added Metamask integration in private explorer

## [2.9.4] - 2022-10-13
### Changed
- [Public Explorer] Removed symbol display on total supply

## [2.9.3] - 2022-10-13
### Added
- [Public Explorer] Total supply option

## [2.9.2] - 2022-10-01
### Changed
- Data retention policy for free plan users. [Read More](https://blog.tryethernal.com)

## [2.9.1] - 2022-09-28
### Fixed
- Account unlocking using private keys
- Resetting a workspace now also clears accounts

## [2.9.0] - 2022-09-26
### Removed
- Firebase Functions dependencies. Should make the app faster overall 🚀
- Alchemy integration frontend (not Alchemy webhooks + unused + deprecated token auth)

## [2.8.6] - 2022-09-25
### Fixed
- Unit tests

## [2.8.5] - 2022-09-25
### Fixed
- Settings update (again)
- Contract importing

## [2.8.4] - 2022-09-25
### Fixed
- Settings update was broken

### Changed
- Batch syncing is now done in a separate queue to avoid slowing down normal syncing

## [2.8.3] - 2022-09-22
### Added
- [Public Explorer] Support of custom icons for external links

## [2.8.2] - 2022-09-22
### Changed
- [Public Explorer] Better support of custom logo

## [2.8.1] - 2022-09-21
### Added
- Spinning wheel when web app is loading

### Removed
- Some firebase dependencies, making startup time faster, especially when registering

## [2.8.0] - 2022-09-21
### Changed
- Api token authentication is now done at the user account level, not the workspace

## [2.7.3] - 2022-09-17
### Added
- [Public Explorer] "Powered By Ethernal" link

## [2.7.2] - 2022-09-17
### Fixed
- Bug preventing from interacting with contracts from app.tryethernal.com if the workspace is public

## [2.7.1] - 2022-09-14
### Changed
- Updated onboarding modal wording (previous update didn't actually include that)

## [2.7.0] - 2022-09-14
### Added
- Cloud Run endpoints to sync block range

### Changed
- Updated onboarding modal wording

## [2.6.2] - 2022-09-09
### Added
- ERC-721 tokens tab on each address page

### Fixed
- Retroactive token transfer detection during contract processing

## [2.6.1] - 2022-09-09
### Changed
- Updated error messaging for easier troubleshooting when connecting a new chain

## [2.6.0] - 2022-09-09
### Added
- ERC-721 Support

## [2.5.4] - 2022-09-01
### Fixed
- Timestamp was displayed incorrectly on block page

## [2.5.3] - 2022-08-30
### Fixed
- Boolean inputs are properly handled in contract interactions now (only supports 'true' and 'false').

## [2.5.2] - 2022-08-23
### Added
- Display modal for workspaces connected to a remote rpc to present public explorer offering.

## [2.5.1] - 2022-08-22
### Added
- If ABI is not available, function calls & events are going to be tried to be matched with an ERC-20 ABI. If there is a match it will be decoded.

## [2.5.0] - 2022-08-19
### Added
- [Public Explorer] Added UI for contract verification. Note that import support is limited for now (it will only work if imported files are in the same directory than contract file), but will be improved in the future.

## [2.4.4] - 2022-08-18
### Changed
- [Public Explorer] Contract verification is now done with partial matches (ie metadata are stripped before checking)

## [2.4.3] - 2022-08-17
### Fixed
- Actually fixed bug

## [2.4.2] - 2022-08-17
### Changed
- Fix feedback collector bug

## [2.4.1] - 2022-08-17
### Added
- Re-introduced feedback collector (new one is open-source). Data collected: message, domain, page, email if you are logged in. This data is stored in Firestore and will only be used internally.

## [2.4.0] - 2022-08-16
### Changed
- [Public Explorer] Improved contract verification mechanism (add support for evm version, optimizer, runs number)

### Fixed
- [Public Explorer] Fixed preventing from p calling contract methods

## [2.3.1] - 2022-08-15
### Changed
- Improved test coverage
- Factorized stat component

## [2.3.0] - 2022-08-14
### Added
- [Public Explorer] Added an overview page with analytics: Total tx count, 24h tx count, active wallets count, 14 days tx count graph, 14 days active wallet count

## [2.2.1] - 2022-08-13
### Changed
- Timestamps are now stored as timestamp with time zone instead of strings

## [2.2.0] - 2022-08-08
### Added
- ERC-20 token balances are displayed on the address pages

### Changed
- On token balances/transfers sections, symbols are now always displayed when available
- Small amounts that were previously displayed as 0 are now entirely displayed

### Fixed
- Amount formatted with decimals were not always correct 

## [2.1.4] - 2022-08-03
### Fixed
- Bug preventing from calling read methods

### Changed
- Better display of transactions function calls

### Added
- Contract creation data is now displayed
- Events emitted during contract creation are now displayed

## [2.1.3] - 2022-08-03
### Fixed
- From addresses couldn't be changed in contract pages

## [2.1.2] - 2022-08-03
### Fixed
- JSON parameters were not properly handled in contract call methods

## [2.1.1] - 2022-08-01
### Changed
- Better UI on mobile
- Import contract modal address field & message is now cleared when closing it
- Removed some messages that didn't make sense for the public explorer
- When ABI is not available, display function sig hash & data, and events emitter, topics and data

## [2.1.0] - 2022-08-01
### Added
- Search by address, contract name, token name & symbol, transaction hash, block number & hash

## [2.0.2] - 2022-07-28
### Fixed
- Error was thrown when loading contract page with no accounts available
- Contract verification was not shown in UI

## [2.0.1] - 2022-07-27
### Fixed
- Default contract call options

## [2.0.0] - 2022-07-26
### Changed
- Postgres replaces Firestore as the main datastore. RTDB is still kept for now to store contracts AST, but will be removed evenutally.
- Pusher is used for realtime updates. That means that you'll need to create an account if you want to self-host

## [1.12.3] - 2022-06-07
### Changed
- Updated ethers.js to 5.6.8

## [1.12.2] - 2022-05-17
### Fixed
- Check if error field is present before accessing it when write call fails

## [1.12.1] - 2022-05-06
- Removing total count in pagination for blocks & transactions (Firestore optimization)
- [Public Explorer] Improve favicon customization

## [1.12.0] - 2022-05-02
### Added
- [Public Explorer] Customization of favicon & page title
- [Public Explorer] Fixed theming issue on buttons

## [1.11.12] - 2022-04-16
### Fixed
- Unit tests

## [1.11.11] - 2022-04-15
### Fixed
- Aray parsing for fixed sized array parameters in functions

## [1.11.10] - 2022-04-06
### Fixed
- Transaction error formatting

## [1.11.9] - 2022-04-05
### Fixed
- [Public Explorer] Performance issue on address pages

## [1.11.8] - 2022-04-05
### Fixed
- Pagination with server-side syncing

## [1.11.7] - 2022-04-04
### Added
- Batch server side syncing, for more reliable historical block syncing

## [1.11.6] - 2022-04-04
### Added
- Server side sync: blocks & txs can now be fetched by the server, in background tasks for better reliability

## [1.11.5] - 2022-04-04
### Changed
- Stop automatically adding new detected contracts in the list for every transfers (except for public explorers)

## [1.11.4] - 2022-03-31
### Added
- [Public Explorer] Add custom banner option

## [1.11.3] - 2022-03-31
### Fixed
- Only record session with LR for logged in users on app.tryethernal.com

### Added
- [Public Explorer] More UI customization options: logo, extra links, font, colors

## [1.11.2] - 2022-03-31
### Fixed
- Fix LR session recording

## [1.11.1] - 2022-03-31
### Changed
- Only record sessions on Logrocket on app.tryethernal.com

## [1.11.0] - 2022-03-30
### Added
- Display error message for failed transactions

## [1.10.0] - 2022-03-29
### Changed
- Balance changes amounts & token transfers amounts are now formatted according to the number of decimals `decimals()` return, if this method doesn't esists, it is not formatted.
- Tokens detected during `Transfer`events processing are added to the list of tokens/contracts

## [1.9.1] - 2022-03-27
### Changed
- Updated wording on storage section

## [1.9.0] - 2022-03-21
### Added
- [Public Explorer] Add server side contract verification, see doc for more info
- [Public Explorer] Add billing for explorer plan

## [1.8.1] - 2022-03-20
### Changed
- [Public Explorer] Do not display metadata upload field unless you're logged in as an admin
- [Public Explorer] Do not display "Token" tab on the contract's page

## [1.8.0] - 2022-03-19
### Fixed
- Pagination was off if a tx or block was synced multiple times

### Added
- Logic to bill transactions & empty blocks for public explorer plans (an empty block is billed, a block including at least one transaction is not billed, all transactions are billed)

## [1.7.2] - 2022-03-14
### Changed
- Blocks & txs synced are now batched with counter increments for more accuracy

## [1.7.1] - 2022-03-14
### Changed
- Display trace step even if there isn't an input

## [1.7.0] - 2022-03-14
### Changed
- Tracing is now proccessed server side for public explorers
- Tracing steps are now formatted as others variables
- Read functions results have a more consistent display with the rest of the UI

## [1.6.3] - 2022-03-11
### Changed
- Balance changes is now processed server side for public explorers

### Removed
- Transaction top right menu for public explorers

## [1.6.2] - 2022-03-10
### Added
- Support for custom domains for public explorers

## [1.6.1] - 2022-03-09
### Fixed
- Bug that prevented storage from being displayed

## [1.6.0] - 2022-03-08
### Changed
- Token transfers are now processed server side & stored - they will be displayed even if there is no ABI associated to the contract
- Balance changes are now stored server side
- uint256 are not formatted anymore, too many use cases for this type to be able to infer how to process it automatically
- Arrays are better displayed now (in functions call parameters & in return values)

### Added
- "Reprocessing" option on a menu on the top right of the transaction page, that will reprocess token transfers & balance changes in case the automatic processing failed for some reason

## [1.5.6] - 2022-03-08
### Fixed
- Onboarding bug that prevented workspace creation
- Alchemy integration bug that prevented activation if url wasn't alchemy.io

## [1.5.5] - 2022-03-03
### Fixed
- Checksumed addresses now works for addresses pages

## [1.5.4] - 2022-03-03
### Changed
- Add /tx/:hash and /token/:hash routes for better Metamask integration

## [1.5.3] - 2022-03-03
### Changed
- Public explorer parameters are now loaded directly from Firestore for faster initial loading

## [1.5.2] - 2022-03-03
### Fixed
- Server side contract processing (token & proxy detection) in public explorer mode

## [1.5.1] - 2022-03-03
### Fixed
- When sending a transaction with Metamask, the value passed was wrong
- Display error messages when using Metamask

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
