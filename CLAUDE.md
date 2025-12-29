# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ethernal is an open-source block explorer for EVM-based chains. It consists of a Vue 3 frontend and a Node.js/Express backend with PostgreSQL database.

## Common Commands

### Frontend (root directory)
```bash
yarn dev          # Start dev server with Vite
yarn build        # Production build
yarn test         # Run Vitest tests
yarn test:update  # Update test snapshots
yarn lint         # ESLint with auto-fix
```

### Backend (run/ directory)
```bash
cd run
npm start                    # Start server with nodemon
npm test                     # Run Jest tests
npm run test:update          # Update snapshots
npm run worker:high          # Start high priority worker
npm run worker:medium        # Start medium priority worker
npm run worker:low           # Start low priority worker
```

### Database Migrations
```bash
cd run
npx sequelize db:migrate     # Run migrations
npx sequelize db:seed:all    # Run all seeders
```

### Docker (self-hosted production)
```bash
make start   # Start production stack (generates env files on first run)
make stop    # Stop all containers
make update  # Pull latest images and run migrations
make nuke    # Remove everything including volumes
```

## Architecture

### Frontend (`src/`)
- **Vue 3** with Vuetify 3 for UI components
- **Pinia** stores in `src/stores/` for state management
- **Vite** for build tooling, Vitest for testing
- Components in `src/components/` - major ones include Block, Transaction, Address, Contract views
- Router in `src/plugins/router.js` - includes Etherscan-compatible routes

### Backend (`run/`)
- **Express** server with Sequelize ORM
- **BullMQ** for job queues with Redis
- **Soketi** (Pusher-compatible) for real-time updates
- API routes in `run/api/` - RESTful endpoints for blocks, transactions, contracts, explorers
- Sequelize models in `run/models/`
- Background jobs in `run/jobs/` - block syncing, contract processing, token transfers
- Workers in `run/workers/` - high/medium/low priority queues

### Job Queue System
Jobs are prioritized into three queues (high, medium, low) plus a dedicated `processHistoricalBlocks` queue. Workers process jobs like `blockSync`, `processContract`, `processTokenTransfer`.

### Key Models
- `Explorer` - represents a blockchain explorer instance
- `Block`, `Transaction`, `Contract` - core blockchain data
- `TokenTransfer`, `ERC721Token` - token-related data
- `User`, `Workspace` - user and workspace management

## Testing

Frontend tests: `tests/unit/` directory, uses Vitest with Vue Test Utils
Backend tests: `run/tests/` directory, uses Jest with supertest

Run a single frontend test:
```bash
yarn test -- path/to/test.spec.js
```

Run a single backend test:
```bash
cd run && npm test -- path/to/test.spec.js
```

## Code Style

- Preserve existing code comments unless completely irrelevant after changes
- Fix Vue console warnings (`[Vue warn]`)
- Use `@/` alias for imports from `src/` in frontend code

## Module Reference

All source files include JSDoc documentation. Below is a reference of the main modules.

### Backend Core Libraries (`run/lib/`)

| Module | Description |
|--------|-------------|
| `utils.js` | Common utilities (sanitize, slugify, BigNumber handling, sleep, timeout) |
| `queue.js` | BullMQ job queue management (enqueue, bulkEnqueue) |
| `rpc.js` | Ethereum RPC connectors (ProviderConnector, ContractConnector, Tracer, ERC721Connector) |
| `crypto.js` | Encryption (AES-256), JWT encoding, Firebase Scrypt password hashing |
| `pusher.js` | Real-time notifications via Pusher/Soketi WebSockets |
| `pm2.js` | PM2 process management client for sync processes |
| `logger.js` | Winston-based structured JSON logging |
| `env.js` | Environment variable accessors |
| `flags.js` | Feature flags (isSelfHosted, isPusherEnabled, isStripeEnabled, etc.) |
| `abi.js` | ABI encoding/decoding, token standard detection (ERC20/721/1155) |
| `trace.js` | Transaction trace parsing (debug_traceTransaction) |

### Backend Models (`run/models/`)

Core data models using Sequelize ORM:

| Model | Description |
|-------|-------------|
| `Block` | Blockchain blocks with transactions |
| `Transaction` | Transactions with receipts and logs |
| `Contract` | Smart contracts with verification status |
| `TokenTransfer` | ERC20/721/1155 token transfers |
| `Explorer` | Explorer instances with branding and settings |
| `Workspace` | User workspaces linked to explorers |
| `User` | User accounts with authentication |
| `StripeSubscription` | Billing subscriptions |
| `OrbitChainConfig` | Arbitrum Orbit L2 chain configuration |
| `OpChainConfig` | OP Stack L2 chain configuration |

### Backend API Routes (`run/api/`)

RESTful endpoints grouped by resource:

| Route File | Endpoints |
|------------|-----------|
| `blocks.js` | GET /blocks, GET /blocks/:number |
| `transactions.js` | GET /transactions, GET /transactions/:hash |
| `contracts.js` | GET /contracts, POST /contracts/:address/verify |
| `explorers.js` | CRUD operations for explorer management |
| `workspaces.js` | Workspace CRUD and settings |

### Backend Jobs (`run/jobs/`)

Background job handlers for async processing:

| Job | Description |
|-----|-------------|
| `blockSync` | Synchronizes blocks from RPC to database |
| `processContract` | Detects token standards, fetches metadata |
| `processTokenTransfer` | Creates token transfer records from logs |
| `integrityCheck` | Verifies block sequence integrity |

### Frontend Plugins (`src/plugins/`)

| Plugin | Description |
|--------|-------------|
| `server.js` | API client with all backend endpoints |
| `router.js` | Vue Router configuration with all routes |
| `pusher.js` | Pusher/Soketi WebSocket client |
| `firebase.js` | Firebase authentication client |
| `vuetify.js` | Vuetify 3 UI framework setup |

### Frontend Stores (`src/stores/`)

Pinia state management:

| Store | Description |
|-------|-------------|
| `user.js` | Current user state and authentication |
| `explorer.js` | Current explorer configuration |
| `currentWorkspace.js` | Active workspace settings |
| `env.js` | Environment and domain info |
| `walletStore.js` | Web3 wallet connection state |

### PM2 Server (`pm2-server/`)

Process management server for blockchain synchronization:

| File | Description |
|------|-------------|
| `app.js` | Express server with PM2 management endpoints |
| `logListener.js` | Event listener for Orbit/OP Stack L1 events |
| `lib/pm2.js` | PM2 process control functions |
