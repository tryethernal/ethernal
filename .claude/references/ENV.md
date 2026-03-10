# Environment Variables

## Core Configuration

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

## Soketi/Pusher (Real-time Updates)

| Variable | Description |
|----------|-------------|
| `SOKETI_HOST` | Soketi server host |
| `SOKETI_PORT` | Soketi server port |
| `SOKETI_DEFAULT_APP_ID` | Soketi app ID |
| `SOKETI_DEFAULT_APP_KEY` | Soketi app key |
| `SOKETI_DEFAULT_APP_SECRET` | Soketi app secret |
| `SOKETI_SCHEME` | http or https |
| `SOKETI_USE_TLS` | Enable TLS |

## Stripe (Billing)

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PREMIUM_PRICE_ID` | Premium plan price ID |
| `DEFAULT_PLAN_SLUG` | Default subscription plan |
| `DEFAULT_EXPLORER_TRIAL_DAYS` | Trial duration (default: 7) |

## PM2 Server (Sync Processes)

| Variable | Description |
|----------|-------------|
| `PM2_HOST` | PM2 management server host |
| `PM2_SECRET` | PM2 server authentication secret |

## Firebase Auth (Cloud Only)

| Variable | Description |
|----------|-------------|
| `ENABLE_FIREBASE_AUTH` | Enable Firebase authentication |
| `FIREBASE_SIGNER_KEY` | Firebase password signer key |
| `FIREBASE_SALT_SEPARATOR` | Firebase salt separator |
| `FIREBASE_ROUNDS` | Firebase hashing rounds |
| `FIREBASE_MEM_COST` | Firebase memory cost |

## External Services

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

## Demo Mode

| Variable | Description |
|----------|-------------|
| `DEMO_USER_ID` | Demo user ID (enables demo mode) |
| `DEMO_TRIAL_SLUG` | Demo trial plan slug |
| `DEMO_EXPLORER_SENDER` | Demo email sender |
| `WHITELISTED_NETWORK_IDS_FOR_DEMO` | Allowed networks for demo |
| `MAX_DEMO_EXPLORERS_FOR_NETWORK` | Max demo explorers per network (default: 3) |

## Queue Monitoring

| Variable | Description | Default |
|----------|-------------|---------|
| `QUEUE_MONITORING_MAX_PROCESSING_TIME` | Max job processing time (seconds) | 60 |
| `QUEUE_MONITORING_HIGH_PROCESSING_TIME_THRESHOLD` | High processing time alert | 20 |
| `QUEUE_MONITORING_HIGH_WAITING_JOB_COUNT_THRESHOLD` | High waiting job alert | 50 |
| `QUEUE_MONITORING_MAX_WAITING_JOB_COUNT` | Max waiting jobs | 100 |
| `HISTORICAL_BLOCKS_PROCESSING_CONCURRENCY` | Historical sync concurrency | 50 |

## BullBoard (Queue UI)

| Variable | Description |
|----------|-------------|
| `BULLBOARD_USERNAME` | BullBoard UI username |
| `BULLBOARD_PASSWORD` | BullBoard UI password |

## Miscellaneous

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level | info |
| `VERSION` | Application version | - |
| `SELF_HOSTED` | Self-hosted mode flag | - |
| `MAX_BLOCK_FOR_SYNC_RESET` | Max blocks for sync reset | 10 |
| `MAX_CONTRACT_FOR_RESET` | Max contracts for reset | 5 |
| `ENABLE_SENTRY_PIPELINE` | Enable Sentry pipeline dashboard and webhook | - |
| `GITHUB_ACTIONS_WEBHOOK_SECRET` | Shared secret for GitHub Actions webhook auth | - |
| `SENTRY_DASHBOARD_USERNAME` | Basic Auth username for Sentry Dashboard API | - |
| `SENTRY_DASHBOARD_PASSWORD` | Basic Auth password for Sentry Dashboard API | - |
| `SENTRY_DASHBOARD_PASSWORD_HASH` | Bcrypt hash of password for Caddy basicauth | - |

## Feature Flags (from `run/lib/flags.js`)

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
