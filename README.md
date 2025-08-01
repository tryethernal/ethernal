 # Ethernal

**Ethernal** is a powerful, open-source block explorer for EVM-based chains. Effortlessly explore, search, and analyze blockchain data—whether you use our hosted service or run your own private instance.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🚀 Quick Start

### Hosted Version

- **Try Ethernal instantly:** [app.tryethernal.com](https://app.tryethernal.com)
- **Create a demo explorer:** [app.tryethernal.com/demo](https://app.tryethernal.com/demo)

---

## 🏠 Self-Hosting Ethernal

> ⚠️ **Beta Notice:**
> 
> The self-hosted version of Ethernal is currently in **beta**. Some features may not work as expected or may be incomplete. If you encounter any issues, please consider [opening an issue](https://github.com/tryethernal/ethernal/issues) to help us improve the project. Your feedback is greatly appreciated!

Run your own Ethernal instance on your infrastructure, with full control over your data and configuration.

### Prerequisites

- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
- [OpenSSL](https://www.openssl.org/) (for environment file generation)
- A domain name or server IP

### 1. Clone the Repository

```bash
git clone https://github.com/tryethernal/ethernal.git
cd ethernal
git checkout $(git describe --tags --abbrev=0) # Makes sure that you are using the latest stable version 
```

### 2. Start Ethernal (Automatic Setup)

Just run:

```bash
make start
```

- On first run, this will prompt you for your domain/IP and port, then generate all secrets and config files using `generate-env-files.sh`.
- On subsequent runs, it will skip generation and simply start the services.
- If you ever want to regenerate your environment/config files, you can run `bash ./generate-env-files.sh` manually.

> **Tip:** All generated secrets and config files are automatically added to `.gitignore` for your safety.

### 3. Access Your Instance

After setup, you'll see a summary like:

```
==================== Ethernal Installation Complete! ====================

🌐  DNS Setup Reminder:
    Make sure to add an A record in your DNS provider:
    your-domain.com -> <your-server-ip-address>

🔗  Start here to setup your instance:
    http://your-domain-or-ip/setup

🐘  PostgreSQL Connection String:
    postgresql://<user>:<password>@<host>:<port>/<db>

📊  Bullboard Access (background jobs):
    http://your-domain-or-ip/bull
    Username: ethernal
    Password: <auto-generated>
=======================================================================
```

**👉 Next step:**

- Open the setup link shown above in your browser.
- This guided setup will help you **create your admin user account** and **set up your first explorer** quickly and easily.
- Once complete, you'll be ready to start using Ethernal!

> **🌐 DNS Setup Reminder:**
> 
> If you are using a custom domain (not an IP address), make sure to add an **A record** in your DNS provider:
> 
>     your-domain.com -> <your-server-ip-address>
> 
> Replace `<your-server-ip-address>` with the actual public IP of your server. This is required for your domain to resolve correctly to your Ethernal instance.

---

## 📡 API

Ethernal exposes a powerful API for programmatic access to your blockchain data and explorer features.

- **API Documentation:**
  - Full list of endpoints and usage examples: [Ethernal API Reference](https://documenter.getpostman.com/view/12141908/2s83zfQ5Tf)
  - **Note:** Replace all instances of `api.tryethernal.com` in the documentation with your own server's domain or IP address.

You can use this API to:
- Query blocks, transactions, contracts, logs, and more
- Integrate Ethernal data into your own dashboards or tools
- Automate explorer management (add/delete explorer, customise them, etc...)

If you need additional endpoints or have suggestions for improvements, **pull requests and issues are welcome!**

---

## 🛠️ Useful Makefile Commands

- `make start` – Start or restart Ethernal (with env/config generation)
- `make stop` – Stop and clean up all containers and networks
- `make update` – Pull latest images and apply migrations/seeds
- `make nuke` – Remove all containers, volumes, and generated config files (all data will be list)

---

## ⚙️ Configuration

**All configuration files and environment variables are generated automatically during setup. For a default installation, you should not need to change any of these values.**
If you want to customize advanced settings, you can edit the relevant files after the initial setup.

Below are the main configuration files and the variables they contain:

---

### Frontend Environment Variables (`.env.prod`)

| Variable                  | Description                              | Default                |
|---------------------------|------------------------------------------|------------------------|
| VITE_VERSION              | Version of the application               | -                      |
| VITE_API_ROOT             | Root URL for API endpoints               | https://api.example.com|
| VITE_MAIN_DOMAIN          | Main domain for the application          | example.com            |
| VITE_PUSHER_KEY           | Pusher API key for real-time updates     | -                      |
| VITE_SOKETI_HOST          | Soketi server host for WebSocket         | -                      |
| VITE_SOKETI_PORT          | Soketi server port                       | -                      |
| VITE_SOKETI_FORCE_TLS     | Force TLS for Soketi                     | -                      |
| VITE_POSTHOG_API_KEY      | PostHog API key for analytics            | -                      |
| VITE_POSTHOG_API_HOST     | PostHog API host                         | -                      |
| VITE_ENABLE_ANALYTICS     | Enable/disable analytics features        | false                  |
| VITE_ENABLE_DEMO          | Enable/disable demo features             | false                  |
| VITE_ENABLE_BILLING       | Enable/disable billing features          | false                  |
| VITE_ENABLE_MARKETING     | Enable/disable marketing features        | false                  |
| VITE_SENTRY_DSN_SECRET    | Sentry DSN secret for error tracking     | -                      |
| VITE_SENTRY_DSN_PROJECT_ID| Sentry project ID                        | -                      |
| VITE_FEEDBACK_FIN_ENDPOINT| Endpoint for feedback collection         | -                      |

---

### Backend Environment Variables (`run/.env.prod`)

| Variable           | Description                        | Default     |
|--------------------|------------------------------------|-------------|
| ENCRYPTION_KEY     | Key used for data encryption       | -           |
| ENCRYPTION_JWT_SECRET | Secret for JWT token encryption | -           |
| SECRET             | Application secret key             | -           |
| CORS_DOMAIN        | CORS allowed domains               | *           |
| NODE_ENV           | Node environment                   | production  |
| REDIS_URL          | Redis connection string            | redis://redis:6379 |
| DB_USER            | PostgreSQL username                | postgres    |
| DB_PASSWORD        | PostgreSQL password                | (random)    |
| DB_NAME            | PostgreSQL database name           | ethernal    |
| DB_HOST            | PostgreSQL host (via pgbouncer)    | pgbouncer   |
| DB_PORT            | PostgreSQL port (via pgbouncer)    | 5433        |
| SOKETI_DEFAULT_APP_ID | Soketi app id                   | default-app |
| SOKETI_DEFAULT_APP_KEY| Soketi app key                  | app-key     |
| SOKETI_DEFAULT_APP_SECRET| Soketi app secret            | (random)    |
| SOKETI_HOST        | Soketi host                        | soketi      |
| SOKETI_PORT        | Soketi port                        | 6001        |
| PM2_HOST           | PM2 dashboard host                 | pm2:9090    |
| PM2_SECRET         | PM2 dashboard secret               | (random)    |
| BULLBOARD_USERNAME | Username for Bull dashboard        | ethernal    |
| BULLBOARD_PASSWORD | Password for Bull dashboard        | (random)    |
| APP_DOMAIN         | Your domain or IP                  | (set at setup)|
| FIREBASE_SIGNER_KEY| Firebase signer key                | (random)    |
| FIREBASE_SALT_SEPARATOR| Firebase salt separator        | (random)    |
| FIREBASE_ROUNDS    | Firebase rounds                    | 8           |
| FIREBASE_MEM_COST  | Firebase memory cost               | 14          |
| APP_URL            | Application URL                    | (set at setup)|
| SELF_HOSTED        | Self-hosted flag                   | true        |
| PORT               | Application port                   | 8888        |
| DEFAULT_PLAN_SLUG  | Default plan slug                  | self-hosted |

---

### PM2 Environment Variables (`pm2-server/.env.prod`)

| Variable           | Description                        | Default     |
|--------------------|------------------------------------|-------------|
| SECRET             | PM2 dashboard secret               | (random)    |
| ETHERNAL_SECRET    | Backend secret                     | (random)    |
| PORT               | PM2 dashboard port                 | 9090        |
| ETHERNAL_REDIS_URL | Redis connection string            | redis://redis:6379/0 |
| ETHERNAL_HOST      | Backend host URL                   | http://backend:8888  |

---

### PostgreSQL Environment Variables (`.env.postgres.prod`)

| Variable           | Description                        | Default     |
|--------------------|------------------------------------|-------------|
| POSTGRES_HOST      | PostgreSQL host                    | postgres    |
| POSTGRES_USER      | PostgreSQL username                | postgres    |
| POSTGRES_PASSWORD  | PostgreSQL password                | (random)    |
| POSTGRES_DB        | PostgreSQL database name           | ethernal    |
| POSTGRES_PORT      | PostgreSQL port                    | 5432        |

---

### Soketi Environment Variables (`.env.soketi.prod`)

| Variable                   | Description                        | Default     |
|----------------------------|------------------------------------|-------------|
| SOKETI_DEFAULT_APP_ID      | Soketi app id                      | default-app |
| SOKETI_DEFAULT_APP_KEY     | Soketi app key                     | app-key     |
| SOKETI_DEFAULT_APP_SECRET  | Soketi app secret                  | (random)    |
| SOKETI_HOST                | Soketi host                        | 0.0.0.0     |
| SOKETI_PORT                | Soketi port                        | 6001        |

---

### Docker Compose Environment Variables (`.env.docker-compose.prod`)

| Variable           | Description                        | Default     |
|--------------------|------------------------------------|-------------|
| EXPOSED_PORT       | Public HTTP port                   | 80 (or as set at setup) |
| EXPOSED_SSL_PORT   | Public HTTPS port                  | 443 (or as set at setup) |

---

**Note:**
- All secrets and passwords are generated randomly for each installation.
- For most users, there is no need to change these values after setup.
- The production Docker Compose file is `docker-compose.prod.yml`. You should run it with the environment file like this:
  
  ```bash
  docker compose -f docker-compose.prod.yml --env-file .env.docker-compose.prod up -d
  ```

---

## 🐞 Bug Reports

Found a bug? Please [open an issue](https://github.com/tryethernal/ethernal/issues) in this repo.

---

## 💖 Support Us

Support Ethernal's development by subscribing to [a paid plan](https://www.tryethernal.com/pricing).

**Note:** The self-hosted version will display ads by default. Running these ads helps support ongoing development of Ethernal. Thank you for contributing to the project by keeping them enabled!

---

## 📬 Contact Us

We'd love to hear from you!

- **Twitter:** [@tryethernal](https://twitter.com/tryethernal)
- **Discord:** [Join our community](https://discord.gg/jEAprf45jj)
- **Email:** contact@tryethernal.com

---

**Happy exploring! 🚀**
