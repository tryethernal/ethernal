#!/usr/bin/env bash

set -e

command -v openssl >/dev/null 2>&1 || { echo >&2 "openssl is required but not installed."; exit 1; }

# Helper functions for random values
gen_hex() { openssl rand -hex "$1"; }
gen_str() { openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c "$1"; }

# Function to check if a string is a valid domain (not an IP address)
is_valid_domain() {
  local domain="$1"
  # Check if it's an IPv4 address
  if [[ $domain =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    return 1
  fi
  # Check if it's an IPv6 address
  if [[ $domain =~ ^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}$ ]]; then
    return 1
  fi
  # Basic domain validation (letters, numbers, dashes, dots)
  if [[ $domain =~ ^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$ ]]; then
    return 0
  fi
  return 1
}

# Parse arguments
dry_run=false
for arg in "$@"; do
  if [ "$arg" = "--dry-run" ]; then
    dry_run=true
  fi
done

# Pre-generate all needed random values
ENCRYPTION_KEY=$(gen_hex 16) # 32 hex chars
ENCRYPTION_JWT_SECRET=$(gen_hex 32) # 64 hex chars
BACKEND_SECRET=$(gen_str 32)
SOKETI_SECRET=$(gen_str 32)
BULLBOARD_PASSWORD=$(gen_str 16)
PM2_SECRET=$(gen_str 32)
FIREBASE_SIGNER_KEY=$(openssl rand -base64 64 | sed 's/"/\\"/g')
FIREBASE_SALT_SEPARATOR=$(openssl rand -base64 16 | sed 's/"/\\"/g')
POSTGRES_HOST="postgres"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD=$(openssl rand -hex 16)
POSTGRES_DB="ethernal"

# Generate md5-hashed password for PgBouncer (md5 + md5(PASSWORD + USERNAME))
HASH_INPUT="${POSTGRES_PASSWORD}${POSTGRES_USER}"
HASHED_PASS="md5$(echo -n "$HASH_INPUT" | md5sum | awk '{print $1}')"

echo ""
echo "######### Starting Ethernal Setup #########"
echo ""
# Prompt for values
read -p "Enter domain name or server IP address: " APP_URL
# Strip http:// or https:// from APP_URL if present
APP_URL=${APP_URL#http://}
APP_URL=${APP_URL#https://}

# Validate domain or IP
if ! is_valid_domain "$APP_URL" && \
   ! [[ $APP_URL =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && \
   ! [[ $APP_URL =~ ^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}$ ]]; then
  echo "Invalid domain/ip"
  exit 1
fi

# Always ask for port, default to 80, validate
read -p "Enter port to serve the app on [80]: " EXPOSED_PORT
EXPOSED_PORT="${EXPOSED_PORT:-80}"
if ! [[ $EXPOSED_PORT =~ ^[0-9]+$ ]] || [ "$EXPOSED_PORT" -lt 1 ] || [ "$EXPOSED_PORT" -gt 65535 ]; then
  echo "Invalid port"
  exit 1
fi

# Set ETHERNAL_HOST based on EXPOSED_PORT
if [ "$EXPOSED_PORT" = "80" ]; then
  ETHERNAL_HOST="$APP_URL"
else
  ETHERNAL_HOST="$APP_URL:$EXPOSED_PORT"
fi

# Ask about SSL if domain is valid
SSL_ENABLED="true"
if is_valid_domain "$APP_URL"; then
  read -p "Do you want to enable SSL (HTTPS) for this domain? [Y/n]: " ENABLE_SSL
  case "$ENABLE_SSL" in
    [nN]|[nN][oO])
      SSL_ENABLED="false"
      ;;
    *)
      SSL_ENABLED="true"
      ;;
  esac
fi

# Compose env file contents
BACKEND_ENV_CONTENT="ENCRYPTION_KEY=$ENCRYPTION_KEY
ENCRYPTION_JWT_SECRET=$ENCRYPTION_JWT_SECRET
SECRET=$BACKEND_SECRET
CORS_DOMAIN=*
NODE_ENV=production
REDIS_URL=redis://redis:6379
DB_USER=$POSTGRES_USER
DB_PASSWORD=$POSTGRES_PASSWORD
DB_NAME=$POSTGRES_DB
DB_HOST=pgbouncer
DB_PORT=5433
SOKETI_DEFAULT_APP_ID=default-app
SOKETI_DEFAULT_APP_KEY=app-key
SOKETI_DEFAULT_APP_SECRET=$SOKETI_SECRET
SOKETI_HOST=soketi
SOKETI_PORT=6001
PM2_HOST=pm2:9090
PM2_SECRET=$PM2_SECRET
BULLBOARD_USERNAME=ethernal
BULLBOARD_PASSWORD=$BULLBOARD_PASSWORD
APP_DOMAIN=$ETHERNAL_HOST
FIREBASE_SIGNER_KEY="\"$FIREBASE_SIGNER_KEY\""
FIREBASE_SALT_SEPARATOR="\"$FIREBASE_SALT_SEPARATOR\""
FIREBASE_ROUNDS=8
FIREBASE_MEM_COST=14
APP_URL=$APP_URL
SELF_HOSTED=true
PORT=8888
DEFAULT_PLAN_SLUG=self-hosted"

PM2_ENV_CONTENT="SECRET=$PM2_SECRET
ETHERNAL_SECRET=$BACKEND_SECRET
PORT=9090
ETHERNAL_REDIS_URL=redis://redis:6379/0
ETHERNAL_HOST=http://backend:8888"

POSTGRES_ENV_CONTENT="POSTGRES_HOST=postgres
POSTGRES_USER=$POSTGRES_USER
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=$POSTGRES_DB
POSTGRES_PORT=5432"

PGBOUNCER_ENV_CONTENT="PGBOUNCER_USER=$POSTGRES_USER
PGBOUNCER_PASSWORD=$POSTGRES_PASSWORD"

PGBOUNCER_USERLIST_CONTENT="\"${POSTGRES_USER}\" \"${HASHED_PASS}\""

PGBOUNCER_INIT_CONTENT="[databases]
${POSTGRES_DB} = host=postgres port=5432 dbname=${POSTGRES_DB} user=${POSTGRES_USER} password=${POSTGRES_PASSWORD}
postgres = host=postgres port=5432 dbname=postgres user=${POSTGRES_USER} password=${POSTGRES_PASSWORD}

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 5433
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
admin_users = ${POSTGRES_USER}
pool_mode = session
max_client_conn = 500
default_pool_size = 10
reserve_pool_size = 5
reserve_pool_timeout = 5.0
server_idle_timeout = 30.0
ignore_startup_parameters = extra_float_digits

log_connections = 1
log_disconnections = 1
log_pooler_errors = 1"

append_to_gitignore() {
  local paths=(
    "run/.env.prod"
    "pm2-server/.env.prod"
    ".env.docker-compose.prod"
    ".env.postgres.prod"
    "pgbouncer/.env.pgbouncer.prod"
    "pgbouncer/userlist.txt"
    "pgbouncer/pgbouncer.ini"
  )
  for path in "${paths[@]}"; do
    grep -qxF "$path" .gitignore 2>/dev/null || echo "$path" >> .gitignore
  done
  echo "Updated .gitignore with env/config files."
}

output_caddyfile() {
  local caddy_staging=""
  if [ "${CADDY_STAGING}" = "true" ]; then
    caddy_staging="    acme_ca https://acme-staging-v02.api.letsencrypt.org/directory"
  fi

  # Shared Caddyfile body (reused in all cases)
  local caddyfile_body
  caddyfile_body="    handle /api/* {
      reverse_proxy backend:8888
    }

    handle_path /bull* {
      reverse_proxy backend:8888
    }

    # WebSocket traffic (Soketi)
    handle /app* {
      reverse_proxy soketi:6001 {
        header_up Upgrade \"websocket\"
        header_up Connection \"Upgrade\"
      }
    }

    handle {
      reverse_proxy frontend:8080
    }

    encode gzip"

  if is_valid_domain "$APP_URL"; then
    # Determine domain for Caddyfile (no port)
    local domain_block
    local apex_domain
    apex_domain="$APP_URL"
    domain_block="*.${apex_domain}, ${apex_domain}"
    local caddyfile_content
    if [ "$SSL_ENABLED" = "false" ]; then
      # HTTP only, no TLS, but with domain
      caddyfile_content="{
        auto_https off
      }
      ${domain_block} {
        ${caddyfile_body}
      }"
      if [ "$dry_run" = true ]; then
        printf '\n--- Caddyfile ---\n'
        printf "%s\n" "$caddyfile_content"
        echo "Printed Caddyfile for domain: ${domain_block} (HTTP only, no TLS, per user choice) (dry run)"
      else
        printf "%s\n" "$caddyfile_content" > Caddyfile
        echo "Wrote Caddyfile for domain: ${domain_block} (HTTP only, no TLS, per user choice)"
      fi
    else
      # SSL enabled (default)
      caddyfile_content="{
    on_demand_tls {
        ask http://backend:8888/api/caddy/validDomain
    }
    ${caddy_staging}
}

${domain_block} {
    tls {
        on_demand
    }
${caddyfile_body}
}"
      if [ "$dry_run" = true ]; then
        printf '\n--- Caddyfile ---\n'
        printf "%s\n" "$caddyfile_content"
        echo "Printed Caddyfile for domain: ${domain_block} (dry run)"
      else
        printf "%s\n" "$caddyfile_content" > Caddyfile
        echo "Wrote Caddyfile for domain: ${domain_block} (HTTPS with on-demand TLS)"
      fi
    fi
  else
    # Assume it's an IP address, always use :80 for HTTP-only Caddyfile
    caddyfile_content=":80 {
${caddyfile_body}
}"
    if [ "$dry_run" = true ]; then
      printf '\n--- Caddyfile ---\n'
      printf "%s\n" "$caddyfile_content"
      echo "Printed Caddyfile for IP address: $ETHERNAL_HOST (HTTP only, no TLS) on port 80 (dry run)"
      echo "WARNING: Serving over HTTP only. SSL/TLS is not available for IP addresses. Not recommended for production."
    else
      printf "%s\n" "$caddyfile_content" > Caddyfile
      echo "Wrote Caddyfile for IP address: $ETHERNAL_HOST (HTTP only, no TLS) on port 80"
      echo "WARNING: Serving over HTTP only. SSL/TLS is not available for IP addresses. Not recommended for production."
    fi
  fi
}

# Output functions
output_backend_env() {
  if [ "$dry_run" = true ]; then
    printf '\n--- run/.env.prod ---\n'
    printf "%s\n" "$BACKEND_ENV_CONTENT"
    echo "Printed run/.env.prod (dry run)"
  else
    mkdir -p run
    printf "%s\n" "$BACKEND_ENV_CONTENT" > run/.env.prod
    echo "Wrote run/.env.prod"
  fi
}

output_pm2_env() {
  if [ "$dry_run" = true ]; then
    printf '\n--- pm2-server/.env.prod ---\n'
    printf "%s\n" "$PM2_ENV_CONTENT"
    echo "Printed pm2-server/.env.prod (dry run)"
  else
    mkdir -p pm2-server
    printf "%s\n" "$PM2_ENV_CONTENT" > pm2-server/.env.prod
    echo "Wrote pm2-server/.env.prod"
  fi
}

output_docker_compose_env() {
  if [ "$dry_run" = true ]; then
    printf '\n--- .env.docker-compose.prod ---\n'
    printf "EXPOSED_PORT=%s\n" "$EXPOSED_PORT"
    echo "Printed .env.docker-compose.prod (dry run)"
  else
    printf "EXPOSED_PORT=%s\n" "$EXPOSED_PORT" > .env.docker-compose.prod
    echo "Wrote .env.docker-compose.prod"
  fi
}

output_postgres_env() {
  if [ "$dry_run" = true ]; then
    printf '\n--- .env.postgres.prod ---\n'
    printf "%s\n" "$POSTGRES_ENV_CONTENT"
    echo "Printed .env.postgres.prod (dry run)"
  else
    printf "%s\n" "$POSTGRES_ENV_CONTENT" > .env.postgres.prod
    echo "Wrote .env.postgres.prod"
  fi
}

output_pgbouncer_env() {
  if [ "$dry_run" = true ]; then
    printf '\n--- pgbouncer/.env.pgbouncer.prod ---\n'
    printf "%s\n" "$PGBOUNCER_ENV_CONTENT"
    echo "Printed pgbouncer/.env.pgbouncer.prod (dry run)"
  else
    mkdir -p pgbouncer
    printf "%s\n" "$PGBOUNCER_ENV_CONTENT" > pgbouncer/.env.pgbouncer.prod
    echo "Wrote pgbouncer/.env.pgbouncer.prod"
  fi
}

output_pgbouncer_userlist() {
  if [ "$dry_run" = true ]; then
    printf '\n--- pgbouncer/userlist.txt ---\n'
    printf "%s\n" "$PGBOUNCER_USERLIST_CONTENT"
    echo "Printed pgbouncer/userlist.txt (dry run)"
  else
    mkdir -p pgbouncer
    printf "%s\n" "$PGBOUNCER_USERLIST_CONTENT" > pgbouncer/userlist.txt
    echo "Wrote pgbouncer/userlist.txt"
  fi
}

output_pgbouncer_ini() {
  if [ "$dry_run" = true ]; then
    printf '\n--- pgbouncer/pgbouncer.ini ---\n'
    printf "%s\n" "$PGBOUNCER_INIT_CONTENT"
    echo "Printed pgbouncer/pgbouncer.ini (dry run)"
  else
    mkdir -p pgbouncer
    printf "%s\n" "$PGBOUNCER_INIT_CONTENT" > pgbouncer/pgbouncer.ini
    echo "Wrote pgbouncer/pgbouncer.ini"
  fi
}

# Output soketi env file
output_soketi_env() {
  local soketi_env_content="SOKETI_DEFAULT_APP_ID=default-app
SOKETI_DEFAULT_APP_KEY=app-key
SOKETI_DEFAULT_APP_SECRET=$SOKETI_SECRET
SOKETI_HOST=0.0.0.0
SOKETI_PORT=6001"
  if [ "$dry_run" = true ]; then
    printf '\n--- .env.soketi.prod ---\n'
    printf "%s\n" "$soketi_env_content"
    echo "Printed .env.soketi.prod (dry run)"
  else
    printf "%s\n" "$soketi_env_content" > .env.soketi.prod
    echo "Wrote .env.soketi.prod"
  fi
}

# Main output
output_backend_env
output_pm2_env
output_docker_compose_env
output_postgres_env
output_pgbouncer_env
output_pgbouncer_userlist
output_pgbouncer_ini
output_soketi_env

# Generate Caddyfile if ETHERNAL_HOST is a valid domain
output_caddyfile

if [ "$dry_run" = false ]; then
  append_to_gitignore
fi
