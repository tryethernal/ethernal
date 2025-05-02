# Ethernal

Ethernal is a block explorer for EVM-based chains.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Hosted version

You can sign-up and get started right away on https://app.tryethernal.com

More details about features and pricing on the homepage: https://www.tryethernal.com

## Self-hosted version

Self-host Ethernal on your server with your own Firebase instance.

Installation instructions: https://doc.tryethernal.com/getting-started/quickstart

## Configuration

### Frontend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| VITE_VERSION | Version of the application | - |
| VITE_API_ROOT | Root URL for API endpoints | https://api.example.com |
| VITE_MAIN_DOMAIN | Main domain for the application | example.com |
| VITE_PUSHER_KEY | Pusher API key for real-time updates | - |
| VITE_SOKETI_HOST | Soketi server host for WebSocket connections | - |
| VITE_SOKETI_PORT | Soketi server port | - |
| VITE_SOKETI_FORCE_TLS | Force TLS for Soketi connections | - |
| VITE_POSTHOG_API_KEY | PostHog API key for analytics | - |
| VITE_POSTHOG_API_HOST | PostHog API host | - |
| VITE_ENABLE_ANALYTICS | Enable/disable analytics features | false |
| VITE_ENABLE_DEMO | Enable/disable demo features | false |
| VITE_ENABLE_BILLING | Enable/disable billing features | false |
| VITE_ENABLE_MARKETING | Enable/disable marketing features | false |
| VITE_SENTRY_DSN_SECRET | Sentry DSN secret for error tracking | - |
| VITE_SENTRY_DSN_PROJECT_ID | Sentry project ID | - |
| VITE_FEEDBACK_FIN_ENDPOINT | Endpoint for feedback collection | - |

### Backend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| ENCRYPTION_KEY | Key used for data encryption | - |
| ENCRYPTION_JWT_SECRET | Secret for JWT token encryption | - |
| APP_URL | Application URL | - |
| PUSHER_APP_ID | Pusher application ID | - |
| PUSHER_KEY | Pusher API key | - |
| PUSHER_SECRET | Pusher API secret | - |
| REDIS_HOST | Redis server hostname | redis |
| REDIS_PORT | Redis server port | 6379 |
| DB_HOST | PostgreSQL server hostname | postgres |
| POSTGRES_USER | PostgreSQL username | postgres |
| POSTGRES_PASSWORD | PostgreSQL password | postgres |
| DB_NAME | PostgreSQL database name | ethernal |
| DB_PORT | PostgreSQL server port | 5432 |
| BULLBOARD_USERNAME | Username for Bull dashboard | ethernal |
| BULLBOARD_PASSWORD | Password for Bull dashboard | ethernal |
| SECRET | Application secret key | secret |
| PORT | Application port | 8888 |
| NODE_ENV | Node environment | production |
| CORS_DOMAIN | CORS allowed domains | * |

### Important Notes

1. For production deployment, make sure to:
   - Change all default passwords and secrets
   - Restrict CORS_DOMAIN to specific domains
   - Use strong encryption keys
   - Set appropriate Pusher/Soketi configurations

2. Optional features can be enabled/disabled using the corresponding environment variables:
   - Analytics: VITE_ENABLE_ANALYTICS
   - Demo mode: VITE_ENABLE_DEMO
   - Billing: VITE_ENABLE_BILLING
   - Marketing: VITE_ENABLE_MARKETING

3. For development, you can copy `.env.example` to `.env` and adjust the values accordingly.

## Bugs Report

You can open an issue in this repo.

## Support Us

You can support the development of Ethernal by subscribing to the Premium plan ($20/mo) or donating on Gitcoin: https://gitcoin.co/grants/3982/ethernal

## Contact Us

Feel free to reach out about anything!

Twitter: https://twitter.com/tryethernal

Discord: https://discord.gg/jEAprf45jj

Email: contact@tryethernal.com
