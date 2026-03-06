# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

**When working on a task, check these first:**

| Task Type | Key Files to Check |
|-----------|-------------------|
| API endpoint | `run/api/[feature].js`, `run/lib/firebase.js`, `src/plugins/server.js` |
| New model | `run/models/`, `run/migrations/`, `run/lib/firebase.js` |
| Background job | `run/jobs/[name].js`, `run/jobs/index.js`, `run/lib/queue.js` |
| Frontend component | `src/components/`, `src/stores/`, `src/plugins/router.js` |
| Auth/permissions | `run/middlewares/auth.js`, `run/middlewares/workspaceAuth.js` |
| L2 integrations | `run/lib/orbit*.js`, `run/lib/op*.js`, `pm2-server/logListener.js`, `pm2-server/opLogListener.js` |
| Billing/Stripe | `run/webhooks/stripe.js`, `run/lib/stripe.js`, `run/api/stripe.js` |
| Testing | `run/tests/mocks/`, `run/tests/api/`, `tests/unit/` |
| Database schema | `.claude/references/SCHEMA.md` (complete model reference) |
| Sentry pipeline | `run/api/sentryPipeline.js`, `run/webhooks/githubActions.js`, `src/components/SentryDashboard.vue` |

**Critical architectural insight:**
- **Authorization** happens in middleware (`authMiddleware`, `workspaceAuthMiddleware`)
- **firebase.js** is a data access layer abstracting Sequelize models (NOT an auth layer)
- **Workspace** is the multi-tenancy boundary - all queries filter by workspaceId

---

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
npm run worker:high          # Start high priority worker (real-time sync)
npm run worker:medium        # Start medium priority worker (indexing)
npm run worker:highmedium    # Start combined high+medium worker (legacy)
npm run worker:low           # Start low priority worker
```

### Database Migrations

**Against Docker database (local development):**
```bash
docker-compose -f docker-compose.dev.yml exec backend npx sequelize db:migrate
docker-compose -f docker-compose.dev.yml exec backend npx sequelize db:seed:all
```

**Against local PostgreSQL (non-Docker):**
```bash
cd run
npx sequelize db:migrate     # Run migrations
npx sequelize db:seed:all    # Run all seeders
```

**Important:** Always use sequelize migrations, never run raw SQL for schema changes.

### Docker Local Development
```bash
docker-compose -f docker-compose.dev.yml up -d    # Start full dev stack
docker-compose -f docker-compose.dev.yml down     # Stop dev stack
docker-compose -f docker-compose.dev.yml logs -f  # View logs
```

### Docker Self-Hosted Production
```bash
make start   # Start production stack (generates env files on first run)
make stop    # Stop all containers
make update  # Pull latest images and run migrations
make nuke    # Remove everything including volumes
```

---

## Architecture

### Caddy Reverse Proxy (Fly.io)

All traffic goes through Caddy on Fly.io (`ethernal-caddy` app, `fly.caddy.toml`):

```
*.tryethernal.com / custom domains
  → Caddy (ethernal-caddy on Fly.io)
    → /api*          → ethernal.internal:8080 (backend)
    → /app*          → ethernal-soketi:6001 (websocket)
    → /bull*         → ethernal.internal:8080 (queue UI)
    → /ingest/*      → app.posthog.com (analytics proxy)
    → /api/2/*       → sentry.tryethernal.com (error tracking proxy)
    → tryethernal.com → file_server from /srv/landing (landing site)
    → everything else → file_server from /srv/app (app frontend)
```

**Key files:** `Caddyfile`, `Dockerfile.caddyfile`, `fly.caddy.toml`

- `Dockerfile.caddyfile` builds both the landing (`landing/`) and app frontend (`src/`) into the Caddy image
- Landing served for `tryethernal.com` and `www.tryethernal.com` only; all other domains get the app frontend
- Caddy handles on-demand TLS for explorer subdomains and custom domains
- Self-hosted users generate their own Caddyfile via `generate-env-files.sh` (unaffected)
- Caddy deploys via `flyctl deploy -c fly.caddy.toml` (also runs in CI as `deploy_caddy` job)

### Sentry Error & Performance Monitoring

Self-hosted Sentry (v26.2.1) runs on a Hetzner CCX33 at `sentry.tryethernal.com`. Credentials in `.credentials.local`.

- **Backend**: `instrument.js` initializes `@sentry/node` using `SENTRY_DSN` env var (Fly.io secret). Workers wrap jobs in `Sentry.startSpan()` with `op: 'queue.process'` for Queue Monitoring.
- **Frontend**: `@sentry/vue` initialized in `main.js` using `VITE_SENTRY_*` env vars. These are passed as build args to `Dockerfile.caddyfile` from GitHub secrets in CI.
- **Queue monitoring**: `enqueue()` in `run/lib/queue.js` wraps with `op: 'queue.publish'` spans. All 4 workers use `op: 'queue.process'` spans with `messaging.destination.name` and `messaging.message.id` attributes.
- **Proxy**: Caddy on Fly.io proxies `/api/2/*` to `sentry.tryethernal.com` so frontend events route through the explorer's own domain.
- **Auto-fix pipeline**: `.github/workflows/sentry-auto-fix.yml` — Sentry alert rules create GitHub issues with `sentry` label on: new errors (≥2 occurrences in 1h), regressions (previously resolved errors recurring). Claude Code triages (close/escalate/fix), creates fix PRs, processes code review (including Greptile thread resolutions with 30s debounce), merges+deploys when approved, then resolves the Sentry issue via API. Protected files (Stripe, auth, crypto) are never auto-modified. GitHub App `ethernal-sentry` on `tryethernal` org powers the Sentry↔GitHub integration.
- **Proactive scanner**: `.github/workflows/sentry-scanner.yml` — hourly cron queries all unresolved Sentry issues, Claude evaluates which are actionable, creates GitHub issues (feeding into auto-fix pipeline), auto-resolves transient errors.
- **Pipeline dashboard**: `src/components/SentryDashboard.vue` — real-time dashboard at `/sentry-dashboard` showing pipeline runs, stats, and Claude conversation logs. Behind `ENABLE_SENTRY_PIPELINE` feature flag. Webhook at `POST /webhooks/github-actions` receives status updates from workflows. Model: `SentryPipelineRun`.
- **Sentry CLI access**: Use `ssh root@157.90.154.200` then `cd /opt/sentry && docker compose --env-file .env --env-file .env.custom exec -T web sentry shell` for Django shell access (manage tokens, project configs, etc.). API token with full scopes stored as `SENTRY_API_TOKEN` GitHub secret.

### Request Flow

```
Frontend (Vue Component)
    ↓ $server plugin (src/plugins/server.js)
    ↓ HTTP Request
Backend API Route (run/api/*.js)
    ↓ Middleware: authMiddleware OR workspaceAuthMiddleware
    ↓ Sets: req.body.data.user, req.query.workspace
firebase.js (Data access layer)
    ↓ Abstracts Sequelize model queries
Sequelize Models (run/models/)
    ↓ Optional: enqueue background job
BullMQ Workers → Jobs (run/jobs/)
```

### Entity Hierarchy

```
User (1)
  └── Workspace (many)
        ├── Explorer (1) - public-facing explorer instance
        ├── Block (many)
        ├── Transaction (many)
        ├── Contract (many)
        ├── TokenTransfer (many)
        ├── OrbitChainConfig (1) - Arbitrum Orbit L2 config
        └── OpChainConfig (1) - OP Stack L2 config
```

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
- Workers in `run/workers/` - separate high, medium, low, and historical block processing queues

---

## Data Access Patterns

### firebase.js - The Data Access Layer

`run/lib/firebase.js` is a large file (~4500 lines) that abstracts Sequelize model operations. It's used by API routes for:
- Convenience functions over raw model queries
- Consistent query patterns
- Reusable CRUD operations

**Note:** This is NOT an authorization layer. Authorization is handled by middleware.

### Authorization Flow

1. **authMiddleware** (`run/middlewares/auth.js`)
   - Validates Firebase token OR API key from Authorization header
   - Sets `req.body.data.user` and `req.body.data.uid`
   - Used for user-scoped operations

2. **workspaceAuthMiddleware** (`run/middlewares/workspaceAuth.js`)
   - Extends authMiddleware
   - Validates user owns the requested workspace
   - Sets `req.query.workspace` with full workspace object
   - Used for data queries (blocks, transactions, contracts)

### API Route Pattern

```javascript
router.get('/:id', workspaceAuthMiddleware, async (req, res, next) => {
    const data = { ...req.query, ...req.params };

    try {
        if (!data.required_field)
            return managedError(new Error('Missing parameter'), req, res);

        const result = await db.getWorkspaceData(
            data.workspace.id,  // Always workspace-scoped
            data.id,
            data.page,
            data.itemsPerPage
        );

        res.status(200).json(result);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});
```

### Error Handling

```javascript
const { managedError, unmanagedError, managedWorkerError } = require('../lib/errors');

// API: Expected/validation errors (400 status)
managedError(new Error('User message'), req, res);

// API: Unexpected exceptions (500, captured to Sentry)
unmanagedError(error, req, next);

// Jobs: Worker errors (logged with job context)
managedWorkerError(error, jobName, jobData, workerName);
```

---

## Job Queue System

### Queue Priorities

| Priority | Queue | Worker | Use Case |
|----------|-------|--------|----------|
| High | `high` | `highPriority.js` | Real-time sync: blockSync, receiptSync, deposits |
| Medium | `medium` | `mediumPriority.js` | Indexing: processContract, processTokenTransfer, L2 finalization |
| Low | `low` | `lowPriority.js` | Analytics, cleanup, non-urgent tasks |
| Special | `processHistoricalBlocks` | `processHistoricalBlocks.js` | Dedicated queue for historical sync |

**Note:** High and medium run as separate processes for event loop isolation. `highMediumPriority.js` still exists as a combined entry point for backward compatibility. Medium tier has extended `lockDuration` (300s) and `maxStalledCount` (5) for longer-running indexing jobs.

### Enqueue Pattern

```javascript
const { enqueue, bulkEnqueue } = require('../lib/queue');

// Single job
await enqueue(
    'jobName',           // Queue/job name
    `jobName-${id}`,     // Job ID (for deduplication)
    { data },            // Job data
    'high',              // Priority
    null,                // Repeat config
    1000,                // Delay in ms
    true                 // unique: prevents duplicates
);

// Bulk enqueue (batches of 2000)
await bulkEnqueue('jobName', [
    { name: 'job-1', data: { ... } },
    { name: 'job-2', data: { ... } }
], 'medium');
```

### Common Job Chains

```
Block Sync Flow:
blockSync → receiptSync → processContract → processTokenTransfer → balanceChanges
blockSync → processOpBatch (OP batch detection, decoupled from sync path)

L2 Event Flow:
PM2 logListener → storeOrbitDeposit / checkOrbitMessageDeliveredLogs
PM2 opLogListener → storeOpDeposit / checkOpDepositLogs
```

### Job Naming Convention

```
${jobType}-${workspaceId}-${identifier}-${timestamp}

Examples:
- blockSync-123-1000-1703123456789
- processContract-123-0xabc123...
```

---

## L2 Chain Integrations

### Architecture Overview

Both Orbit (Arbitrum) and OP Stack follow the same pattern:

```
L2 Workspace
    └── [Orbit/Op]ChainConfig
          ├── Parent chain ID & RPC
          ├── Contract addresses (portal, inbox, etc.)
          └── Parent workspace reference
                ↓
PM2 Log Listeners
    ├── logListener.js - Orbit bridge events
    ├── opLogListener.js - OP TransactionDeposited events
    └── Enqueues jobs for detected events
                ↓
Background Jobs
    ├── storeOrbitDeposit / storeOpDeposit
    ├── checkOrbitMessageDeliveredLogs / checkOpDepositLogs
    └── finalizePendingOrbitBatches
                ↓
Data Models
    ├── [Orbit/Op]Batch - L1 batch submissions
    ├── [Orbit/Op]Deposit - L1→L2 deposits
    └── [Orbit/Op]Withdrawal - L2→L1 withdrawals
```

### Key Files

| Component | Orbit | OP Stack |
|-----------|-------|----------|
| Config model | `run/models/orbitChainConfig.js` | `run/models/opChainConfig.js` |
| Batch lib | `run/lib/orbitBatches.js` | `run/lib/opBatches.js` |
| API routes | `run/api/orbitBatches.js`, `orbitDeposits.js` | `run/api/opBatches.js`, `opDeposits.js` |
| Frontend | `src/components/OrbitBatches.vue` | `src/components/OpBatches.vue` |
| Event listener | `pm2-server/logListener.js` | `pm2-server/opLogListener.js` |

### Cross-Chain Event Detection

L2 integrations watch L1 parent chain events:
- **Deposits**: `TransactionDeposited` event on portal contract
- **Batches**: Transactions to batch inbox address
- **Withdrawals**: `MessagePassed` event on L2, then `WithdrawalFinalized` on L1

---

## Common Modification Patterns

### Adding a New API Endpoint

1. **Create route handler**: `run/api/[feature].js`
   ```javascript
   router.get('/:id', workspaceAuthMiddleware, async (req, res, next) => {
       // ...
   });
   ```

2. **Add data access function** (optional): `run/lib/firebase.js`

3. **Register route**: `run/api/index.js`
   ```javascript
   router.use('/feature', require('./feature'));
   ```

4. **Add frontend method**: `src/plugins/server.js`
   ```javascript
   getFeature(id) { return this.get(`/feature/${id}`); }
   ```

5. **Create tests**: `run/tests/api/[feature].test.js`

### Adding a New Model

1. **Create model**: `run/models/[Feature].js`
   ```javascript
   module.exports = (sequelize, DataTypes) => {
       class Feature extends Model {
           static associate(models) {
               Feature.belongsTo(models.Workspace);
           }
       }
       Feature.init({ /* fields */ }, { sequelize, modelName: 'Feature' });
       return Feature;
   };
   ```

2. **Create migration**: `run/migrations/YYYYMMDDHHMMSS-create-feature.js`

3. **Export model**: `run/models/index.js` (automatic)

4. **Add CRUD functions**: `run/lib/firebase.js`

5. **Create mock**: `run/tests/mocks/models/[Feature].js`

### Adding a New Background Job

1. **Create job handler**: `run/jobs/[jobName].js`
   ```javascript
   module.exports = async job => {
       const { workspaceId, data } = job.data;
       // Process job
   };
   ```

2. **Register job**: `run/jobs/index.js`
   ```javascript
   module.exports = {
       // ...existing jobs
       jobName: require('./jobName')
   };
   ```

3. **Enqueue from API or other job**:
   ```javascript
   await enqueue('jobName', `jobName-${id}`, { workspaceId, data });
   ```

### Adding a Frontend Component

1. **Create component**: `src/components/[Feature].vue`

2. **Use stores for state**:
   ```javascript
   import { useCurrentWorkspaceStore } from '@/stores/currentWorkspace';
   const workspace = useCurrentWorkspaceStore();
   ```

3. **Add route** (if page): `src/plugins/router.js`

4. **Create test**: `tests/unit/components/[Feature].spec.js`

---

## Testing

### Backend Tests (`run/tests/`)

**Test Structure:**
```
run/tests/
├── mocks/
│   ├── lib/          # Library mocks (firebase, rpc, queue, lock)
│   ├── models/       # Model mocks
│   └── middlewares/  # Auth middleware mocks
├── api/              # API route tests
├── jobs/             # Job handler tests
└── lib/              # Library function tests
```

**Key Mock Files:**
- `mocks/lib/firebase.js` - Auto-mocks all firebase.js exports
- `mocks/models/index.js` - Centralizes model mocks
- `mocks/middlewares/auth.js` - Injects uid='123' and user data
- `mocks/middlewares/workspaceAuth.js` - Injects authenticated workspace

**Running Tests:**
```bash
# Single test file
cd run && npm test -- tests/api/faucets.test.js

# With pattern matching
cd run && npm test -- --testPathPattern=faucets
```

### Frontend Tests (`tests/unit/`)

```bash
# Single test file
yarn test -- ExplorerOpSettings

# With watch mode
yarn test -- --watch
```

### Writing API Tests

```javascript
require('../mocks/lib/queue');
require('../mocks/lib/firebase');
require('../mocks/models');

const supertest = require('supertest');
const app = require('../../app');
const request = supertest(app);
const db = require('../../lib/firebase');

describe('GET /feature/:id', () => {
    it('returns feature data', async () => {
        jest.spyOn(db, 'getFeature').mockResolvedValueOnce({ id: 1, name: 'test' });

        const res = await request.get('/api/feature/1')
            .send({ data: { workspace: { id: 1 } } });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('test');
    });
});
```

---

## Feature Locations

| Feature | Backend API | Frontend Component | Models |
|---------|-------------|-------------------|--------|
| **Blocks** | `api/blocks.js` | `Block.vue`, `Blocks.vue` | `block.js` |
| **Transactions** | `api/transactions.js` | `Transaction.vue`, `Transactions.vue` | `transaction.js` |
| **Contracts** | `api/contracts.js` | `ContractDetails.vue`, `Contracts.vue` | `contract.js` |
| **Token Transfers** | `api/modules/tokens.js` | `TokenTransfers.vue` | `tokentransfer.js` |
| **Faucets** | `api/faucets.js` | `ExplorerFaucet.vue` | `explorerfaucet.js` |
| **V2 DEX** | `api/v2Dexes.js` | `ExplorerDex.vue` | `explorerv2dex.js` |
| **Billing** | `api/stripe.js`, `webhooks/stripe.js` | `ExplorerBilling.vue` | `stripesubscription.js` |
| **Orbit L2** | `api/orbitBatches.js`, `orbitDeposits.js` | `OrbitBatches.vue`, `OrbitDeposits.vue` | `orbitBatch.js`, `orbitdeposit.js` |
| **OP Stack L2** | `api/opBatches.js`, `opDeposits.js` | `OpBatches.vue`, `OpDeposits.vue` | `opBatch.js`, `opDeposit.js` |
| **ERC721 NFTs** | `api/erc721Tokens.js`, `erc721Collections.js` | `ERC721Token.vue`, `ERC721Collection.vue` | `erc721token.js` |
| **Contract Verification** | `api/contracts.js`, `lib/processContractVerification.js` | `ContractVerification.vue` | `ContractVerification.js` |
| **Sentry Pipeline** | `api/sentryPipeline.js`, `webhooks/githubActions.js` | `SentryDashboard.vue`, `SentryPipelineRunDetail.vue` | `sentrypipelinerun.js` |

---

## Environment Variables

### Core Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | Required |
| `ENCRYPTION_KEY` | AES-256 encryption key (32 chars) | Required |
| `SECRET` | General app secret | Required |
| `AUTH_SECRET` | Authentication secret | Required |
| `NODE_ENV` | Environment (development, production) | development |
| `APP_DOMAIN` | Application domain (e.g., ethernal.io) | Required |
| `APP_URL` | Full application URL (derived from `APP_DOMAIN` if not set) | Optional (cloud) / Required (self-hosted) |

### Soketi/Pusher (Real-time Updates)

| Variable | Description |
|----------|-------------|
| `SOKETI_HOST` | Soketi server host |
| `SOKETI_PORT` | Soketi server port |
| `SOKETI_DEFAULT_APP_ID` | Soketi app ID |
| `SOKETI_DEFAULT_APP_KEY` | Soketi app key |
| `SOKETI_DEFAULT_APP_SECRET` | Soketi app secret |
| `SOKETI_SCHEME` | http or https |
| `SOKETI_USE_TLS` | Enable TLS |

### Stripe (Billing)

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PREMIUM_PRICE_ID` | Premium plan price ID |
| `DEFAULT_PLAN_SLUG` | Default subscription plan |
| `DEFAULT_EXPLORER_TRIAL_DAYS` | Trial duration (default: 7) |

### PM2 Server (Sync Processes)

| Variable | Description |
|----------|-------------|
| `PM2_HOST` | PM2 management server host |
| `PM2_SECRET` | PM2 server authentication secret |

### Firebase Auth (Cloud Only)

| Variable | Description |
|----------|-------------|
| `ENABLE_FIREBASE_AUTH` | Enable Firebase authentication |
| `FIREBASE_SIGNER_KEY` | Firebase password signer key |
| `FIREBASE_SALT_SEPARATOR` | Firebase salt separator |
| `FIREBASE_ROUNDS` | Firebase hashing rounds |
| `FIREBASE_MEM_COST` | Firebase memory cost |

### External Services

| Variable | Description |
|----------|-------------|
| `SENTRY_DSN` | Sentry error tracking DSN |
| `MAILJET_PUBLIC_KEY` | Mailjet API public key |
| `MAILJET_PRIVATE_KEY` | Mailjet API private key |
| `MAILJET_SENDER` | Mailjet sender email |
| `OPSGENIE_API_KEY` | Opsgenie alerting API key |
| `GOOGLE_API_KEY` | Google API key |
| `APPROXIMATED_API_KEY` | Approximated SSL API key |
| `APPROXIMATED_TARGET_IP` | Approximated target IP |

### Demo Mode

| Variable | Description |
|----------|-------------|
| `DEMO_USER_ID` | Demo user ID (enables demo mode) |
| `DEMO_TRIAL_SLUG` | Demo trial plan slug |
| `DEMO_EXPLORER_SENDER` | Demo email sender |
| `WHITELISTED_NETWORK_IDS_FOR_DEMO` | Allowed networks for demo |
| `MAX_DEMO_EXPLORERS_FOR_NETWORK` | Max demo explorers per network (default: 3) |

### Queue Monitoring

| Variable | Description | Default |
|----------|-------------|---------|
| `QUEUE_MONITORING_MAX_PROCESSING_TIME` | Max job processing time (seconds) | 60 |
| `QUEUE_MONITORING_HIGH_PROCESSING_TIME_THRESHOLD` | High processing time alert | 20 |
| `QUEUE_MONITORING_HIGH_WAITING_JOB_COUNT_THRESHOLD` | High waiting job alert | 50 |
| `QUEUE_MONITORING_MAX_WAITING_JOB_COUNT` | Max waiting jobs | 100 |
| `HISTORICAL_BLOCKS_PROCESSING_CONCURRENCY` | Historical sync concurrency | 50 |

### BullBoard (Queue UI)

| Variable | Description |
|----------|-------------|
| `BULLBOARD_USERNAME` | BullBoard UI username |
| `BULLBOARD_PASSWORD` | BullBoard UI password |

### Miscellaneous

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level | info |
| `VERSION` | Application version | - |
| `SELF_HOSTED` | Self-hosted mode flag | - |
| `MAX_BLOCK_FOR_SYNC_RESET` | Max blocks for sync reset | 10 |
| `MAX_CONTRACT_FOR_RESET` | Max contracts for reset | 5 |
| `ENABLE_SENTRY_PIPELINE` | Enable Sentry pipeline dashboard and webhook | - |
| `GITHUB_ACTIONS_WEBHOOK_SECRET` | Shared secret for GitHub Actions webhook auth | - |

### Feature Flags (from `run/lib/flags.js`)

| Flag Function | Required Variables |
|---------------|-------------------|
| `isSelfHosted()` | `SELF_HOSTED` |
| `isPusherEnabled()` | All `SOKETI_*` variables |
| `isStripeEnabled()` | `STRIPE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY` |
| `isFirebaseAuthEnabled()` | `ENABLE_FIREBASE_AUTH` |
| `isDemoEnabled()` | `DEMO_USER_ID` |
| `isQuicknodeEnabled()` | `QUICKNODE_CREDENTIALS` |
| `isMailjetEnabled()` | `MAILJET_PUBLIC_KEY`, `MAILJET_PRIVATE_KEY` |
| `isApproximatedEnabled()` | `APPROXIMATED_API_KEY`, `APPROXIMATED_TARGET_IP` |
| `isSentryPipelineEnabled()` | `ENABLE_SENTRY_PIPELINE` |

---

## Production Database Operations

When running queries against the production database:

1. **Always check row counts first** before DELETE/UPDATE — run a `SELECT count(*)` to understand the scope
2. **Batch large operations** — if more than ~10K rows will be affected, batch in chunks of 10K with separate transactions to avoid connection timeouts
3. **Check FK dependencies** before deleting — query `information_schema.table_constraints` to find child tables that need to be cleaned first
4. **Use `SET CONSTRAINTS ALL DEFERRED`** inside transactions when deleting across related tables
5. **Connection timeouts** — the production DB drops connections on queries running longer than ~2-3 minutes; keep individual operations under that threshold

---

## Code Style

- Preserve existing code comments unless completely irrelevant after changes
- Fix Vue console warnings (`[Vue warn]`)
- Use `@/` alias for imports from `src/` in frontend code
- Delete one-off scripts after use — don't leave them in the repo unless they're reusable

## Design Resources

- Browse quality design components, animations, and 3D elements at: https://21st.dev/community/components

## Documentation Requirements

All new files and functions must include JSDoc documentation. Use the `/**` format (not `/*`).

### Vue Components (Frontend)

Add a JSDoc comment block before the `<script>` or `<script setup>` tag:

```vue
/**
 * @fileoverview Brief description of the component's purpose.
 * @component ComponentName
 *
 * @prop {string} propName - Description of the prop
 * @emits eventName - Description of when this event is emitted
 */
<script setup>
```

### Backend Functions (Node.js)

```javascript
/**
 * Brief description of what the function does.
 *
 * @param {string} param1 - Description of param1
 * @param {Object} options - Configuration options
 * @param {boolean} [options.optional] - Optional parameter
 * @returns {Promise<ReturnType>} Description of return value
 * @throws {Error} When something fails
 */
```

### Key Documentation Tags

| Tag | Usage |
|-----|-------|
| `@fileoverview` | File-level description (first line of JSDoc) |
| `@module` | Module path for backend files |
| `@component` | Vue component name |
| `@param` | Function parameter with type and description |
| `@returns` | Return value with type and description |
| `@throws` | Exceptions that may be thrown |
| `@prop` | Vue component prop |
| `@emits` | Vue component event |

---

## Module Reference

### Backend Core Libraries (`run/lib/`)

| Module | Description |
|--------|-------------|
| `firebase.js` | Data access layer - abstracts Sequelize model operations |
| `utils.js` | Common utilities (sanitize, slugify, BigNumber handling, sleep, timeout) |
| `queue.js` | BullMQ job queue management (enqueue, bulkEnqueue) |
| `rpc.js` | Ethereum RPC connectors (ProviderConnector, ContractConnector, Tracer) |
| `crypto.js` | Encryption (AES-256), JWT encoding, Firebase Scrypt password hashing |
| `pusher.js` | Real-time notifications via Pusher/Soketi WebSockets |
| `pm2.js` | PM2 process management client for sync processes |
| `logger.js` | Winston-based structured JSON logging |
| `env.js` | Environment variable accessors |
| `flags.js` | Feature flags (isSelfHosted, isPusherEnabled, isStripeEnabled, etc.) |
| `errors.js` | Error handling utilities (managedError, unmanagedError) |
| `abi.js` | ABI encoding/decoding, token standard detection (ERC20/721/1155) |
| `trace.js` | Transaction trace parsing (debug_traceTransaction) |
| `stripe.js` | Stripe subscription and billing utilities |
| `orbitBatches.js` | Arbitrum Orbit batch detection and parsing |
| `orbitWithdrawals.js` | Orbit withdrawal event handling |
| `opBatches.js` | OP Stack batch detection and parsing |

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
| `OrbitBatch` | L2 batch submissions to L1 |
| `OrbitDeposit` | L1→L2 deposit transactions |
| `OrbitWithdrawal` | L2→L1 withdrawal messages |

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
| `logListener.js` | Event listener for Orbit L1 bridge events |
| `opLogListener.js` | Event listener for OP Stack L1 deposit events |
| `lib/pm2.js` | PM2 process control functions |

---

## Workflow

- **Always create a PR after completing work.** Once a feature, bugfix, or any code change is done, create a pull request targeting `develop`. This triggers an automated review process.

### Code Review (CodeAnt AI)

Creating a PR automatically triggers a CodeAnt AI review. When asked to check review comments:

1. **Fetch both top-level and inline comments** using `gh api repos/tryethernal/ethernal/pulls/{number}/reviews` and `gh api repos/tryethernal/ethernal/pulls/{number}/comments`.
2. **Take comments seriously** — most flagged issues are legitimate. Fix them.
3. **Always verify before acting** — check that the issue actually exists in the code. The reviewer can be wrong. For example, it may flag missing files that actually exist, or claim a check is missing when it's already there.
4. **Challenge incorrect comments** — if a review comment is wrong, say so explicitly to the user (e.g., "This comment is incorrect because X") rather than silently making unnecessary changes.
5. **Never remove working code to satisfy a review bot** — if code references real assets, API endpoints, or patterns that work correctly, do not replace them based on a reviewer assumption.

### End-of-Session Flow

Use `/wrapup` (the **Ethernal** project command, not the global one) when a feature branch is ready. It runs these steps in order:

1. **`/refactor`** — PR-scoped code quality cleanup (jscpd, knip, code-simplifier). Only touches files changed on the current branch vs `develop`.
2. **`/update-claudemd`** — Updates documentation if new patterns were introduced.
3. **Create PR** — Pushes the branch and creates a PR targeting `develop`.

### Release Flow

After PRs are merged into `develop`, use `/deploy` (the **Ethernal** project command) to release:

1. Generates changelog from commits since last tag
2. Bumps version via `npm version {major|minor|patch} --message '%s'` (updates package.json + tags)
3. Pushes tag and branch to `develop`
4. Syncs `master` with `develop` (`git merge --no-ff`)
5. CI handles Docker builds and deployment — completion is determined by `release_back` and `release_front` jobs (other jobs like `build_and_push_*` are side builds and don't block the deploy)

When user says "merge and deploy", merge the PR with `gh pr merge --squash --admin` first, then run the deploy flow.

---

## Landing Site (`landing/`)

Standalone Vue 3 + Vuetify 3 marketing site, separate from the main app frontend.

### Commands

```bash
cd landing
npm run dev          # Dev server (default port 5173)
npm run build        # Production build to dist/
```

### Structure

| Directory | Purpose |
|-----------|---------|
| `src/components/` | Reusable landing components (Navbar, Footer, Hero, Features, Pricing, etc.) |
| `src/pages/` | Route-level pages (HomePage, PricingPage, ContactPage, integration pages) |
| `src/styles/landing.scss` | Global styles, `.landing-section` spacing, button classes |
| `src/composables/` | Vue composables (useScrollReveal) |
| `brand-kit/` | Brand specification (JSON + visual audit HTML) |

### Key Patterns

- **FeatureSection.vue**: Reusable component with `#visual` slot for browser preview mockups, supports `inline-icon`, `compact`, `:reverse` props
- **Browser preview mockup**: macOS-style window chrome (`.preview-header`, `.dot.red/.yellow/.green`, `.preview-url-bar`, `.preview-body`)
- **Page structure**: `LandingLayout` wrapper → `page-title-bar` header → content sections → `LandingCTA`
- **API calls**: Use `import.meta.env.VITE_APP_URL` (defaults to `https://app.ethernal.com`, override via `VITE_APP_URL` env var or `.env.development`)
- **Mega menu navbar**: 3-column dropdown (Development Tools, Infrastructure, L2 Rollups) with icons and descriptions

### Docker Dev

The landing service runs in Docker compose on port 8174. Set `VITE_APP_URL` in `.env.development` to point to the local backend (port 8888).

---

## Marketing & Brand Kit

When creating or editing marketing materials (landing pages, blog posts, emails, social content, ad copy), follow the brand kit specifications.

### Key Files

| File | Purpose |
|------|---------|
| `landing/brand-kit/brand-kit.json` | Machine-readable brand spec (colors, typography, components, voice rules) |
| `landing/brand-kit/index.html` | Visual audit page — open in browser to review all brand elements |
| `.agents/product-marketing-context.md` | Product positioning, personas, competitive landscape, messaging |

### Brand Rules (Quick Reference)

**Logo:** Text-only wordmark "Ethernal" in Exo 600. NO icon/symbol/SVG exists — never fabricate one.

**Colors:**
- Primary: `#3D95CE`, Light: `#5DAAE0`, Dark: `#29648E`
- Gradient: `linear-gradient(90deg, #3D95CE, #5DAAE0)` — for CTAs and accent text
- Dark backgrounds: `#0B1120` (base), `#111827` (card), `#151D2E` (surface)
- Text: `#F1F5F9` (primary), `#94A3B8` (secondary), `#64748B` (muted)
- Borders: `rgba(61, 149, 206, 0.22)` (subtle), `rgba(61, 149, 206, 0.4)` (glow)

**Typography:**
- Headings: Exo (600-700), letter-spacing -0.02em
- Body: Roboto (400-500), line-height 1.7
- Code: JetBrains Mono

**Voice:** Direct, confident, developer-friendly. Short sentences. Lead with benefit. No hype words (revolutionary, game-changing). Use concrete numbers. Show code over marketing speak. Only emoji is 🍷 in footer. Never use em dashes (—) or double hyphens (--) in copy; rewrite sentences to avoid them.

**Tagline:** "Etherscan for your blockchain"

**Trust badges:** No credit card required · 7-day free trial · MIT licensed

**Social proof:** Consensys, Rakuten, Zilliqa, Primex, Entangle, Smart Trade

**Key URLs:**
- App: `https://app.ethernal.com`
- Docs: `https://doc.tryethernal.com`
- GitHub: `https://github.com/tryethernal/ethernal`
- Discord: `https://discord.gg/jYCER6Mh`
- Blog: `https://blog.tryethernal.com`
